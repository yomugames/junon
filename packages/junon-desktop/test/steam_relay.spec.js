// The main-process side of Steam co-op (src/steam_host.js, src/steam_guest.js)
// against an in-memory stand-in for Steam Networking Sockets, with the real
// game server behind the host. Everything but Steam itself runs: the guest's
// hello and framing, the host's relay over the desktop channel, and the
// server's Steam guest sockets. Real Steam is checked by hand
// (docs/exec-plans/active/steam-coop.md). Runs in Node, without Electron.
const { test, expect } = require('@playwright/test')
const { fork } = require('child_process')
const fs = require('fs')
const os = require('os')
const path = require('path')
const protobuf = require('protobufjs')
const SteamHost = require('../src/steam_host')
const SteamGuest = require('../src/steam_guest')

const JUNON_IO_ROOT = path.dirname(require.resolve('junon-io/package.json'))
const PROTOCOL_DIR = path.join(path.dirname(require.resolve('junon-common/package.json')), 'protocol')
const MessageWrapper = protobuf.loadSync(path.join(PROTOCOL_DIR, 'app.proto')).lookupType('app.MessageWrapper')
const PROTOCOL_HASH = require('crypto').createHash('md5')
  .update(Buffer.concat(['enum.proto', 'base.proto', 'app.proto'].map((file) => fs.readFileSync(path.join(PROTOCOL_DIR, file)))))
  .digest('hex').substring(0, 8)

const HOST_STEAM_ID = '76561198000000010'
const GUEST_STEAM_ID = '76561198000000020'
const OWNER_UID = '0123456789abcdef0123456789abcdef'

const CONNECTING = 1
const CONNECTED = 3
const CLOSED_BY_PEER = 4

// Steam's reliable send buffer (512 KB by default), small here so joining
// fills it and the relays' outboxes have to wait
const SEND_BUFFER_BYTES = 2 * 1024

// One Steam network shared by every endpoint. Each endpoint has the subset of
// steamworks-ffi-node's networkingSockets API that the relays use.
class FakeSteamNetwork {
  constructor() {
    this.connections = new Map()
    this.endpoints = new Map()
    this.nextHandle = 1
    this.refusedSends = 0
  }

  endpoint(steamId) {
    const network = this
    const endpoint = {
      steamId,
      listenSockets: new Set(),
      pollGroups: new Map(),
      requestHandlers: [],
      stateHandlers: [],
      events: [],

      createListenSocketP2P() {
        const handle = network.nextHandle++
        endpoint.listenSockets.add(handle)
        return handle
      },
      closeListenSocket(handle) { endpoint.listenSockets.delete(handle); return true },
      createPollGroup() {
        const handle = network.nextHandle++
        endpoint.pollGroups.set(handle, new Set())
        return handle
      },
      destroyPollGroup(handle) { endpoint.pollGroups.delete(handle); return true },
      setConnectionPollGroup(connection, group) { endpoint.pollGroups.get(group).add(connection); return true },

      connectP2P(remoteSteamId) {
        const remote = network.endpoints.get(String(remoteSteamId))
        const listenSocket = remote && Array.from(remote.listenSockets)[0]
        const local = network.addConnection(endpoint, String(remoteSteamId), 0)
        if (!listenSocket) {
          endpoint.events.push(() => network.changeState(local, CLOSED_BY_PEER))
          return local.handle
        }

        const incoming = network.addConnection(remote, steamId, listenSocket)
        local.peer = incoming
        incoming.peer = local
        remote.events.push(() => {
          network.changeState(incoming, CONNECTING)
          remote.requestHandlers.forEach((handler) => handler({ connection: incoming.handle, identityRemote: steamId, listenSocket }))
        })
        return local.handle
      },
      acceptConnection(handle) {
        const connection = network.connections.get(handle)
        network.changeState(connection, CONNECTED)
        connection.peer.owner.events.push(() => network.changeState(connection.peer, CONNECTED))
        return 1
      },
      closeConnection(handle) {
        const connection = network.connections.get(handle)
        if (!connection || connection.isClosed) return true
        connection.isClosed = true
        const peer = connection.peer
        // reliable data already sent still arrives, then the close
        if (peer && !peer.isClosed) peer.owner.events.push(() => network.changeState(peer, CLOSED_BY_PEER))
        return true
      },
      sendMessage(handle, data) {
        const connection = network.connections.get(handle)
        if (!connection || connection.isClosed || connection.state !== CONNECTED || connection.peer.isClosed) return { success: false, result: 3 }
        // like Steam, one message always fits in an empty buffer
        if (connection.unackedBytes > 0 && connection.unackedBytes + data.length > SEND_BUFFER_BYTES) {
          network.refusedSends++
          return { success: false, result: 25 }
        }
        connection.unackedBytes += data.length
        connection.peer.inbox.push(Buffer.from(data))
        return { success: true, result: 1 }
      },
      receiveMessages(handle, max) {
        const connection = network.connections.get(handle)
        return connection ? network.take(connection, max) : []
      },
      receiveMessagesOnPollGroup(group, max) {
        const messages = []
        endpoint.pollGroups.get(group).forEach((handle) => messages.push(...network.take(network.connections.get(handle), max)))
        return messages
      },
      onConnectionRequest(handler) { endpoint.requestHandlers.push(handler) },
      onConnectionStateChange(handler) { endpoint.stateHandlers.push(handler) }
    }

    this.endpoints.set(steamId, endpoint)
    return endpoint
  }

  addConnection(owner, identityRemote, listenSocket) {
    const connection = { handle: this.nextHandle++, owner, identityRemote, listenSocket, state: 0, inbox: [], unackedBytes: 0, isClosed: false }
    this.connections.set(connection.handle, connection)
    return connection
  }

  changeState(connection, state) {
    if (connection.state === state) return
    const oldState = connection.state
    connection.state = state
    const change = { connection: connection.handle, oldState, newState: state, info: { identityRemote: connection.identityRemote, listenSocket: connection.listenSocket } }
    connection.owner.stateHandlers.forEach((handler) => handler(change))
  }

  take(connection, max) {
    const messages = connection.inbox.splice(0, max).map((data) => ({ data, connection: connection.handle }))
    // the peer acknowledges what this side read
    if (connection.peer) connection.peer.unackedBytes = Math.max(0, connection.peer.unackedBytes - messages.reduce((sum, message) => sum + message.data.length, 0))
    return messages
  }
}

// SteamRuntime's role: run callbacks, then the relays' polls
function fakeRuntime(network, steamId) {
  const runtime = {
    networking: network.endpoint(steamId),
    pollers: new Set(),
    addPoller: (poller) => runtime.pollers.add(poller),
    poll() {
      const events = runtime.networking.events.splice(0)
      events.forEach((event) => event())
      runtime.pollers.forEach((poller) => poller.poll())
    }
  }
  runtime.resume = () => { runtime.timer = setInterval(() => runtime.poll(), 5) }
  runtime.pause = () => clearInterval(runtime.timer)
  runtime.resume()
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

async function waitFor(check, description) {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    const value = check()
    if (value) return value
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
  throw new Error('timed out waiting for ' + description)
}

let savesDir
let server
let runtimes = []

test.beforeEach(() => {
  savesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'junon-steam-relay-'))
})

test.afterEach(async () => {
  runtimes.forEach((runtime) => runtime.pause())
  runtimes = []
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

test('a Steam guest joins the host\'s world through both relays', async () => {
  const network = new FakeSteamNetwork()
  const hostRuntime = fakeRuntime(network, HOST_STEAM_ID)
  const guestRuntime = fakeRuntime(network, GUEST_STEAM_ID)
  runtimes.push(hostRuntime, guestRuntime)

  let isReady = false
  let steamHost
  server = startServer((message) => {
    if (message.type === 'ready') isReady = true
    else if (message.type === 'steamHosting') steamHost.setHosting(message.isHosting)
    else if (SteamHost.isServerMessage(message)) steamHost.onServerMessage(message)
  })
  steamHost = new SteamHost(hostRuntime, (message) => server.send(message))
  const steamGuest = new SteamGuest(guestRuntime)
  await waitFor(() => isReady, 'server ready')

  const { worldId } = await server.request('createWorld', { ownerUid: OWNER_UID, name: 'Relay World', gameMode: 'survival' })

  // not hosted yet: nothing listens, and the renderer hears why
  const renderer = fakeWebContents()
  const early = steamGuest.open(renderer, HOST_STEAM_ID, PROTOCOL_HASH)
  expect((await waitFor(() => renderer.events.find((event) => event.socketId === early && event.type === 'close'), 'early close')).reason).toContain("Can't reach")

  await server.request('hostWorldOnSteam', { worldId, ownerUid: OWNER_UID })
  await waitFor(() => steamHost.listenSocket, 'listen socket')

  // another version is refused with the host's reason
  const outdated = steamGuest.open(renderer, HOST_STEAM_ID, '00000000')
  const refused = await waitFor(() => renderer.events.find((event) => event.socketId === outdated && event.type === 'close'), 'version close')
  expect(refused).toMatchObject({ wasOpen: false })
  expect(refused.reason).toContain('Version mismatch')

  const socketId = steamGuest.open(renderer, HOST_STEAM_ID, PROTOCOL_HASH)
  await waitFor(() => renderer.events.find((event) => event.socketId === socketId && event.type === 'open'), 'open')

  const decoded = () => renderer.events.filter((event) => event.socketId === socketId && event.type === 'message' && event.kind === 1).map((event) => MessageWrapper.decode(event.data))
  const waitForGame = async (kind) => (await waitFor(() => decoded().find((message) => message.kind === kind), kind))[kind]

  steamGuest.send(socketId, renderer, 1, MessageWrapper.encode({ Ping: {} }).finish())
  await waitForGame('Pong')

  // a guest that stops reading for a while (a slow link) fills Steam's send
  // buffer; the host's outbox holds the rest and nothing is lost
  steamGuest.send(socketId, renderer, 1, MessageWrapper.encode({ RequestGame: { uid: 'guestProfile1234', username: 'SteamGuest', screenWidth: 800, screenHeight: 600, sessionId: 'guestProfile1234' } }).finish())
  guestRuntime.pause()
  await waitFor(() => network.refusedSends > 0, 'a full send buffer')
  guestRuntime.resume()
  expect((await waitForGame('JoinGame')).uid).toBe('guestProfile1234')

  // the server ends Steam hosting: the guest hears the reason, then the close
  await server.request('stopHosting')
  expect((await waitForGame('PlayerKick')).reason).toContain('stopped hosting')
  expect(await waitFor(() => renderer.events.find((event) => event.socketId === socketId && event.type === 'close'), 'close')).toMatchObject({ wasOpen: true })
  await waitFor(() => !steamHost.listenSocket, 'listen socket closed')
  expect(steamHost.connections.size).toBe(0)
  expect(steamGuest.sockets.size).toBe(0)
})
