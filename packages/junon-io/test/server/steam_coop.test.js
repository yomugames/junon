// Steam co-op on the game server. The desktop shell's main process owns the
// Steam connections and relays their frames over the desktop channel
// (server/util/steam_socket_bridge.js). Here the test plays main: it forks the
// real server with a Node IPC channel in place of Electron's parent port and
// sends the same messages main would for Steam guests.
const { fork } = require('child_process')
const crypto = require('crypto')
const fs = require('fs')
const os = require('os')
const path = require('path')
const protobuf = require('protobufjs')
const SteamFraming = require('junon-common/steam_framing')

const SERVER_PATH = path.resolve(__dirname, '../../server/server.js')
const PROTOCOL_DIR = path.join(path.dirname(require.resolve('junon-common/package.json')), 'protocol')
const MessageWrapper = protobuf.loadSync(path.join(PROTOCOL_DIR, 'app.proto')).lookupType('app.MessageWrapper')
const PROTOCOL_HASH = crypto.createHash('md5')
  .update(Buffer.concat(['enum.proto', 'base.proto', 'app.proto'].map((file) => fs.readFileSync(path.join(PROTOCOL_DIR, file)))))
  .digest('hex').substring(0, 8)

const OWNER_UID = '0123456789abcdef0123456789abcdef'
const GUEST_STEAM_ID = '76561198000000001'

jest.setTimeout(180_000)

let savesDir
let server

beforeEach(() => {
  savesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'junon-steam-'))
})

afterEach(async () => {
  if (server && server.exitCode === null) {
    server.kill('SIGTERM')
    await server.exited
  }
  fs.rmSync(savesDir, { recursive: true, force: true })
})

function startServer() {
  const env = Object.assign({}, process.env, {
    NODE_ENV: 'standalone',
    JUNON_SAVES_DIR: savesDir,
    JUNON_DESKTOP_IPC: '1',
    PORT: String(20_000 + Math.floor(Math.random() * 20_000))
  })
  delete env.JUNON_WORLD_ID
  delete env.JUNON_OWNER_UID

  const child = fork(SERVER_PATH, [], { env, serialization: 'advanced', stdio: ['ignore', 'pipe', 'pipe', 'ipc'] })
  child.output = ''
  child.stdout.on('data', (chunk) => { child.output += chunk })
  child.stderr.on('data', (chunk) => { child.output += chunk })
  child.exited = new Promise((resolve) => child.on('exit', resolve))
  child.messages = []
  child.on('message', (message) => child.messages.push(message))
  child.nextRequestId = 1
  return child
}

async function waitFor(predicate, description) {
  const deadline = Date.now() + 60_000
  while (Date.now() < deadline) {
    const found = server.messages.find(predicate)
    if (found) return found
    if (server.exitCode !== null) throw new Error('server exited:\n' + server.output)
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  throw new Error('timed out waiting for ' + description + ':\n' + JSON.stringify(server.messages.slice(-10)) + '\n' + server.output)
}

async function request(method, ...args) {
  const id = server.nextRequestId++
  server.send({ type: 'localApi', id, method, args })
  const result = await waitFor((message) => message.type === 'localApiResult' && message.id === id, method)
  if (result.error) throw new Error(result.error)
  return result.result
}

// a Steam connection as main relays it
function steamGuest(connectionId, steamId = GUEST_STEAM_ID) {
  const isFor = (message) => message.connectionId === connectionId
  const guest = {
    open: () => server.send({ type: 'steamOpen', connectionId, steamId }),
    close: () => server.send({ type: 'steamClose', connectionId }),
    sendControl: (data) => server.send({ type: 'steamFrame', connectionId, kind: SteamFraming.KIND_CONTROL, data }),
    hello: (protocol = PROTOCOL_HASH) => guest.sendControl({ type: 'hello', version: SteamFraming.STEAM_TRANSPORT_VERSION, protocol }),
    sendGame: (payload) => server.send({ type: 'steamFrame', connectionId, kind: SteamFraming.KIND_BINARY, data: MessageWrapper.encode(payload).finish() }),
    waitForControl: (type) => waitFor((message) => isFor(message) && message.type === 'steamFrame' && message.kind === SteamFraming.KIND_CONTROL && message.data.type === type, type),
    waitForClose: () => waitFor((message) => isFor(message) && message.type === 'steamClose', 'close of ' + connectionId),
    waitForGame: async (kind) => {
      const message = await waitFor((entry) => isFor(entry) && entry.type === 'steamFrame' && entry.kind === SteamFraming.KIND_BINARY && MessageWrapper.decode(entry.data).kind === kind, kind)
      return MessageWrapper.decode(message.data)[kind]
    },
    requestGame: (uid, username) => guest.sendGame({ RequestGame: { uid, username, screenWidth: 800, screenHeight: 600, sessionId: uid } })
  }
  return guest
}

test('Steam guests join through the desktop channel while the world is hosted on Steam', async () => {
  server = startServer()
  await waitFor((message) => message.type === 'ready', 'ready')

  const { worldId } = await request('createWorld', { ownerUid: OWNER_UID, name: 'Steam World', gameMode: 'survival' })

  // nobody gets in before hosting starts
  const early = steamGuest(1)
  early.open()
  expect((await early.waitForClose()).isGraceful).toBe(false)

  await expect(request('hostWorldOnSteam', { worldId, ownerUid: 'ffffffffffffffffffffffffffffffff' })).rejects.toThrow('another profile')
  const hosted = await request('hostWorldOnSteam', { worldId, ownerUid: OWNER_UID })
  expect(hosted.hosting).toMatchObject({ worldId, isOnSteam: true, port: null, addresses: [] })
  await waitFor((message) => message.type === 'steamHosting' && message.isHosting === true, 'steamHosting on')
  await expect(request('hostWorldOnSteam', { worldId, ownerUid: OWNER_UID })).rejects.toThrow('Already hosting')
  expect((await request('listWorlds')).hosting).toMatchObject({ isOnSteam: true })

  // main only passes Steam ids, but the server checks anyway
  const badId = steamGuest(2, 'not-a-steam-id')
  badId.open()
  await badId.waitForClose()

  // game traffic before the hello is refused
  const eager = steamGuest(3)
  eager.open()
  eager.sendGame({ Ping: {} })
  expect((await eager.waitForControl('reject')).data.reason).toContain('before hello')
  await eager.waitForClose()

  const outdated = steamGuest(4)
  outdated.open()
  outdated.hello('00000000')
  expect((await outdated.waitForControl('reject')).data).toMatchObject({ code: 'version' })
  expect((await outdated.waitForClose()).isGraceful).toBe(true)

  const guest = steamGuest(5)
  guest.open()
  guest.hello()
  await guest.waitForControl('welcome')
  guest.sendGame({ Ping: {} })
  await guest.waitForGame('Pong')

  // the owner's profile can't come in as a guest
  const impostor = steamGuest(6, '76561198000000002')
  impostor.open()
  impostor.hello()
  await impostor.waitForControl('welcome')
  impostor.requestGame(OWNER_UID, 'Impostor')
  expect((await impostor.waitForGame('CantJoin')).message).toContain('owns the world')

  guest.requestGame('guestProfile1234', 'SteamGuest')
  expect((await guest.waitForGame('JoinGame')).uid).toBe('guestProfile1234')

  // a guest that disconnects is handled like a closed socket, and a frame
  // for an unknown connection is ignored
  impostor.close()
  server.send({ type: 'steamFrame', connectionId: 99, kind: SteamFraming.KIND_BINARY, data: new Uint8Array([1]) })

  // stopping ends Steam hosting: guests get the reason, then a graceful close
  await request('stopHosting')
  expect((await guest.waitForGame('PlayerKick')).reason).toContain('stopped hosting')
  expect((await guest.waitForClose()).isGraceful).toBe(true)
  await waitFor((message) => message.type === 'steamHosting' && message.isHosting === false, 'steamHosting off')
  expect((await request('listWorlds')).hosting).toBe(null)

  const late = steamGuest(7)
  late.open()
  await late.waitForClose()
})

test('a guest that never says hello is dropped, and quitting kicks Steam guests', async () => {
  server = startServer()
  await waitFor((message) => message.type === 'ready', 'ready')
  const { worldId } = await request('createWorld', { ownerUid: OWNER_UID, name: 'Steam World', gameMode: 'survival' })
  await request('hostWorldOnSteam', { worldId, ownerUid: OWNER_UID })

  const silent = steamGuest(1)
  silent.open()

  const guest = steamGuest(2)
  guest.open()
  guest.hello()
  await guest.waitForControl('welcome')
  guest.requestGame('guestProfile1234', 'SteamGuest')
  await guest.waitForGame('JoinGame')

  // quitting notifies guests before the save
  server.send({ type: 'shutdown' })
  expect((await guest.waitForGame('PlayerKick')).reason).toContain('closed the world')
  expect((await silent.waitForControl('reject')).data.reason).toContain('no longer being hosted')
  expect(await server.exited).toBe(0)
})
