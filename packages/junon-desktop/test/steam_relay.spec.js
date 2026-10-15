// The main-process side of Steam co-op (src/steam.js, steam_lobby.js,
// steam_host.js, steam_guest.js) on an in-memory Steam
// (support/fake_steam.js), with the real game server behind the host.
// Everything but Steam itself runs: the lobby, the host's membership check,
// the guest's hello and framing, the host's relay over the desktop channel,
// and the server's Steam guest sockets. Real Steam is checked by hand
// (docs/exec-plans/active/steam-coop.md). Runs in Node, without Electron.
const { test, expect } = require('@playwright/test')
const { fork } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const protobuf = require('protobufjs')
const SteamRuntime = require('../src/steam')
const SteamHost = require('../src/steam_host')
const SteamGuest = require('../src/steam_guest')
const SteamLobbies = require('../src/steam_lobby')
const { FakeSteamNetwork, FakeSteamSdk } = require('./support/fake_steam')

const JUNON_IO_ROOT = path.dirname(require.resolve('junon-io/package.json'))
const PROTOCOL_DIR = path.join(path.dirname(require.resolve('junon-common/package.json')), 'protocol')
const MessageWrapper = protobuf.loadSync(path.join(PROTOCOL_DIR, 'app.proto')).lookupType('app.MessageWrapper')
const PROTOCOL_HASH = require('crypto').createHash('md5')
  .update(Buffer.concat(['enum.proto', 'base.proto', 'app.proto'].map((file) => fs.readFileSync(path.join(PROTOCOL_DIR, file)))))
  .digest('hex').substring(0, 8)

const HOST_STEAM_ID = '76561198000000010'
const GUEST_STEAM_ID = '76561198000000020'
const STRANGER_STEAM_ID = '76561198000000030'
const OWNER_UID = '0123456789abcdef0123456789abcdef'

// Steam's reliable send buffer (512 KB by default), small here so joining
// fills it and the relays' outboxes have to wait
const SEND_BUFFER_BYTES = 2 * 1024

// the desktop app's Steam runtime, on a fake SDK instead of the binding
function steamUser(network, steamId, friends) {
  const runtime = new SteamRuntime()
  runtime.sdk = new FakeSteamSdk(network, steamId, { friends })
  runtime.appId = 480
  runtime.isAvailable = true
  runtime.joinRequests = []
  runtime.lobbies = new SteamLobbies(runtime, { onJoinRequest: (lobbyId) => runtime.joinRequests.push(lobbyId) })
  runtime.guest = new SteamGuest(runtime)
  runtime.pause = () => { runtime.isAvailable = false; clearTimeout(runtime.pollTimer) }
  runtime.resume = () => { runtime.isAvailable = true; runtime.schedulePoll() }
  runtime.schedulePoll()
  return runtime
}

// a renderer's webContents, as steam_guest.js uses it
function fakeWebContents() {
  return {
    events: [],
    send(channel, socketId, event) { this.events.push(Object.assign({ socketId }, event)) },
    once() {},
    isDestroyed: () => false
  }
}

async function waitFor(check, description, timeout = 60_000) {
  const deadline = Date.now() + timeout
  while (Date.now() < deadline) {
    const value = check()
    if (value) return value
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error('timed out waiting for ' + description)
}

let savesDir
let server
let users = []

test.beforeEach(() => {
  savesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'junon-steam-relay-'))
})

test.afterEach(async () => {
  users.forEach((user) => user.pause())
  users = []
  if (server && server.exitCode === null) {
    server.kill('SIGTERM')
    await new Promise((resolve) => server.once('exit', resolve))
  }
  fs.rmSync(savesDir, { recursive: true, force: true })
})

// the game server as the desktop app runs it, with Node IPC in place of the
// utility process's parent port (server/util/desktop_channel.js)
function startServer(onMessage) {
  const env = Object.assign({}, process.env, { NODE_ENV: 'standalone', JUNON_SAVES_DIR: savesDir, JUNON_DESKTOP_IPC: '1', PORT: String(20_000 + Math.floor(Math.random() * 20_000)) })
  delete env.JUNON_WORLD_ID
  delete env.JUNON_OWNER_UID
  const child = fork(path.join(JUNON_IO_ROOT, 'server', 'server.js'), [], { cwd: JUNON_IO_ROOT, env, serialization: 'advanced', stdio: ['ignore', 'ignore', 'inherit', 'ipc'] })
  child.results = new Map()
  child.on('message', (message) => {
    if (message.type === 'localApiResult') child.results.set(message.id, message)
    else onMessage(message)
  })
  child.nextId = 1
  child.request = async (method, ...args) => {
    const id = child.nextId++
    child.send({ type: 'localApi', id, method, args })
    const result = await waitFor(() => child.results.get(id), method)
    if (result.error) throw new Error(result.error)
    return result.result
  }
  return child
}

// main.js's part for the host: steamHosting opens the lobby and the listen
// socket, and frames go both ways
async function startHost(network) {
  const host = steamUser(network, HOST_STEAM_ID, [GUEST_STEAM_ID])
  users.push(host)

  let isReady = false
  server = startServer((message) => {
    if (message.type === 'ready') isReady = true
    else if (message.type === 'steamHosting') {
      host.steamHost.setHosting(message.isHosting)
      if (message.isHosting) host.lobbyOpening = host.lobbies.openLobby(message)
      else host.lobbies.closeLobby()
    } else if (SteamHost.isServerMessage(message)) host.steamHost.onServerMessage(message)
  })
  host.steamHost = new SteamHost(host, (message) => server.send(message), (steamId) => host.lobbies.isMember(steamId))
  await waitFor(() => isReady, 'server ready')
  return host
}

test('a Steam friend joins the host\'s lobby and world through both relays', async () => {
  const network = new FakeSteamNetwork({ sendBufferBytes: SEND_BUFFER_BYTES })
  const host = await startHost(network)
  const guest = steamUser(network, GUEST_STEAM_ID, [HOST_STEAM_ID])
  users.push(guest)

  const { worldId } = await server.request('createWorld', { ownerUid: OWNER_UID, name: 'Relay World', gameMode: 'survival' })

  // not hosted yet: nothing listens, and the renderer hears why
  const renderer = fakeWebContents()
  const early = guest.guest.open(renderer, HOST_STEAM_ID, PROTOCOL_HASH)
  expect((await waitFor(() => renderer.events.find((event) => event.socketId === early && event.type === 'close'), 'early close')).reason).toContain("Can't reach")

  await server.request('hostWorldOnSteam', { worldId, ownerUid: OWNER_UID, lobbyType: 'friends' })
  const lobbyId = await host.lobbyOpening
  expect(network.lobbies.get(lobbyId)).toMatchObject({ owner: HOST_STEAM_ID, type: 1, maxMembers: 20, joinable: true, data: { junon: '1', protocol: PROTOCOL_HASH, world: 'Relay World' } })
  expect(host.sdk.richPresenceData).toMatchObject({ status: 'Hosting Relay World', steam_player_group: lobbyId })

  // the guest's Join panel lists the host, and the lobby checks the version
  expect(guest.lobbies.listFriendsHosting()).toEqual([{ steamId: HOST_STEAM_ID, name: host.sdk.personaName, lobbyId, status: 'Hosting Relay World' }])
  await expect(guest.lobbies.joinLobby(lobbyId, '00000000')).rejects.toThrow('Version mismatch')

  // a version the lobby data doesn't catch is still refused by the server
  const joined = await guest.lobbies.joinLobby(lobbyId, PROTOCOL_HASH)
  expect(joined).toEqual({ hostSteamId: HOST_STEAM_ID, worldName: 'Relay World' })
  const outdated = guest.guest.open(renderer, HOST_STEAM_ID, 'ffffffff')
  const refused = await waitFor(() => renderer.events.find((event) => event.socketId === outdated && event.type === 'close'), 'version close')
  expect(refused).toMatchObject({ wasOpen: false })
  expect(refused.reason).toContain('Version mismatch')

  const socketId = guest.guest.open(renderer, HOST_STEAM_ID, PROTOCOL_HASH)
  await waitFor(() => renderer.events.find((event) => event.socketId === socketId && event.type === 'open'), 'open')

  const decoded = () => renderer.events.filter((event) => event.socketId === socketId && event.type === 'message' && event.kind === 1).map((event) => MessageWrapper.decode(event.data))
  const waitForGame = async (kind) => (await waitFor(() => decoded().find((message) => message.kind === kind), kind))[kind]

  guest.guest.send(socketId, renderer, 1, MessageWrapper.encode({ Ping: {} }).finish())
  await waitForGame('Pong')

  // a guest that stops reading for a while (a slow link) fills Steam's send
  // buffer; the host's outbox holds the rest and nothing is lost
  guest.guest.send(socketId, renderer, 1, MessageWrapper.encode({ RequestGame: { uid: 'guestProfile1234', username: 'SteamGuest', screenWidth: 800, screenHeight: 600, sessionId: 'guestProfile1234' } }).finish())
  guest.pause()
  await waitFor(() => network.refusedSends > 0, 'a full send buffer')
  guest.resume()
  expect((await waitForGame('JoinGame')).uid).toBe('guestProfile1234')

  // the server ends Steam hosting: the guest hears the reason, then the close,
  // and the host leaves the lobby
  await server.request('stopHosting')
  expect((await waitForGame('PlayerKick')).reason).toContain('stopped hosting')
  expect(await waitFor(() => renderer.events.find((event) => event.socketId === socketId && event.type === 'close'), 'close')).toMatchObject({ wasOpen: true })
  await waitFor(() => !host.steamHost.listenSocket, 'listen socket closed')
  expect(host.steamHost.connections.size).toBe(0)
  expect(guest.guest.sockets.size).toBe(0)
  expect(network.lobbies.get(lobbyId).members).toEqual([GUEST_STEAM_ID])
  expect(host.sdk.richPresenceData).toEqual({})
  guest.lobbies.leaveJoinedLobby()
  expect(network.lobbies.has(lobbyId)).toBe(false)
})

test('the host refuses Steam connections from outside its lobby', async () => {
  const network = new FakeSteamNetwork()
  const host = await startHost(network)
  const stranger = steamUser(network, STRANGER_STEAM_ID, [])
  users.push(stranger)

  const { worldId } = await server.request('createWorld', { ownerUid: OWNER_UID, name: 'Invite World', gameMode: 'survival' })
  await server.request('hostWorldOnSteam', { worldId, ownerUid: OWNER_UID, lobbyType: 'invite' })
  const lobbyId = await host.lobbyOpening
  expect(network.lobbies.get(lobbyId).type).toBe(0)

  // an invite-only lobby can't be joined uninvited
  await expect(stranger.lobbies.joinLobby(lobbyId, PROTOCOL_HASH)).rejects.toThrow("Couldn't join")

  // connecting straight to the host, skipping the lobby, is never accepted
  const renderer = fakeWebContents()
  const socketId = stranger.guest.open(renderer, HOST_STEAM_ID, PROTOCOL_HASH)
  await waitFor(() => host.steamHost.pendingRequests.size === 1, 'connection request')
  const closed = await waitFor(() => renderer.events.find((event) => event.socketId === socketId && event.type === 'close'), 'refusal', 40_000)
  expect(closed).toMatchObject({ wasOpen: false })
  expect(host.steamHost.pendingRequests.size).toBe(0)
  expect(host.steamHost.connections.size).toBe(0)

  // once invited, the same player gets in
  host.lobbies.invite(STRANGER_STEAM_ID)
  expect(host.sdk.calls).toContainEqual({ type: 'invite', lobbyId, steamId: STRANGER_STEAM_ID })
  await stranger.lobbies.joinLobby(lobbyId, PROTOCOL_HASH)
  const invitedSocket = stranger.guest.open(renderer, HOST_STEAM_ID, PROTOCOL_HASH)
  await waitFor(() => renderer.events.find((event) => event.socketId === invitedSocket && event.type === 'open'), 'open')

  // a host can't join a lobby while hosting
  await expect(host.lobbies.joinLobby(lobbyId, PROTOCOL_HASH)).rejects.toThrow('Stop hosting')
})
