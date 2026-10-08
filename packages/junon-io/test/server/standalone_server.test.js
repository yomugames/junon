// Boots the real game server with NODE_ENV=standalone - no matchmaker, MySQL,
// Firebase or S3 - and checks the offline world lifecycle: a new world is
// generated and registered in the saves directory's sqlite database, stopping
// the server saves it, and the next start loads that save instead of
// generating a new map.
const { spawn } = require('child_process')
const fs = require('fs')
const net = require('net')
const os = require('os')
const path = require('path')
const zlib = require('zlib')
const protobuf = require('protobufjs')
const sqlite3 = require('sqlite3')
const WorldSerializer = require('junon-common/world_serializer')

const SERVER_PATH = path.resolve(__dirname, '../../server/server.js')
const APP_PROTO = path.join(path.dirname(require.resolve('junon-common/world_serializer')), 'protocol/app.proto')
const SAVE_HEADER_PROTO = path.join(path.dirname(require.resolve('junon-common/world_serializer')), 'protocol/save_formats/save_header.proto')

jest.setTimeout(180_000)

let savesDir

beforeEach(() => {
  savesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'junon-standalone-'))
})

afterEach(() => {
  fs.rmSync(savesDir, { recursive: true, force: true })
})

function randomPort() {
  return 20_000 + Math.floor(Math.random() * 20_000)
}

function startServer(extraEnv) {
  const env = Object.assign({}, process.env, {
    NODE_ENV: 'standalone',
    JUNON_SAVES_DIR: savesDir,
    JUNON_WORLD_ID: 'testWorld1',
    JUNON_OWNER_UID: 'ownerProfile123',
    PORT: String(randomPort()),
    JUNON_CLIENT_PORT: String(randomPort())
  }, extraEnv)

  const child = spawn(process.execPath, [SERVER_PATH], { env, stdio: ['ignore', 'pipe', 'pipe'] })
  child.output = ''
  child.stdout.on('data', (chunk) => { child.output += chunk })
  child.stderr.on('data', (chunk) => { child.output += chunk })
  child.exited = new Promise((resolve) => child.on('exit', (code) => resolve(code)))
  child.port = parseInt(env.PORT)
  child.clientPort = parseInt(env.JUNON_CLIENT_PORT)

  return child
}

async function waitForOutput(child, text) {
  const deadline = Date.now() + 120_000
  while (!child.output.includes(text)) {
    if (child.exitCode !== null) throw new Error('server exited early:\n' + child.output)
    if (Date.now() > deadline) throw new Error('timed out waiting for "' + text + '":\n' + child.output)
    await new Promise((resolve) => setTimeout(resolve, 200))
  }
}

function canConnect(host, port) {
  return new Promise((resolve) => {
    const socket = net.connect(port, host)
    socket.on('connect', () => { socket.destroy(); resolve(true) })
    socket.on('error', () => resolve(false))
  })
}

function queryDatabase(sql) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database(path.join(savesDir, 'junon.sqlite'), sqlite3.OPEN_READONLY)
    db.all(sql, (error, rows) => {
      db.close()
      error ? reject(error) : resolve(rows)
    })
  })
}

function readSaveHeader() {
  const compressed = fs.readFileSync(path.join(savesDir, 'testWorld1', 'sector.sav'))
  const SaveState = protobuf.loadSync(SAVE_HEADER_PROTO).lookupType('app.SaveState')
  return SaveState.decode(zlib.gunzipSync(compressed)).metadata
}

test('generates a new world, saves it on shutdown and loads the save on the next start', async () => {
  let server = startServer({ JUNON_WORLD_NAME: 'TestColony', JUNON_GAME_MODE: 'peaceful' })
  await waitForOutput(server, 'Standalone world ready: testWorld1')
  expect(server.output).toContain('Creating new map')

  // game socket only listens on loopback by default
  expect(await canConnect('127.0.0.1', server.port)).toBe(true)

  server.kill('SIGTERM')
  expect(await server.exited).toBe(0)

  let header = readSaveHeader()
  expect(header.uid).toEqual('testWorld1')
  expect(header.name).toEqual('TestColony')
  expect(header.gameMode).toEqual('peaceful')

  // registered like a hosted sector row, owned by the launching profile
  expect(await queryDatabase('select uid, name, gameMode, creatorUid from sectors')).toEqual([
    { uid: 'testWorld1', name: 'TestColony', gameMode: 'peaceful', creatorUid: 'ownerProfile123' }
  ])
  expect(await queryDatabase('select uid from users')).toEqual([{ uid: 'ownerProfile123' }])

  // name and mode now come from the registry, not from the launcher
  server = startServer({ JUNON_WORLD_NAME: 'Ignored', JUNON_GAME_MODE: 'survival' })
  await waitForOutput(server, 'Standalone world ready: testWorld1')
  expect(server.output).toContain('Save data found')
  expect(server.output).not.toContain('Creating new map')

  server.kill('SIGTERM')
  expect(await server.exited).toBe(0)

  header = readSaveHeader()
  expect(header.name).toEqual('TestColony')
  expect(header.gameMode).toEqual('peaceful')
})

// standalone uses the `ws` socket server (uWebSockets.js doesn't load in
// Electron); it must speak the same binary protocol as the hosted uWS server
test('game socket answers protobuf messages over ws', async () => {
  const WebSocket = require('ws')
  const MessageWrapper = protobuf.loadSync(APP_PROTO).lookupType('app.MessageWrapper')

  const server = startServer({ JUNON_WORLD_ID: '', JUNON_OWNER_UID: '' })
  try {
    await waitForOutput(server, 'Junon Gameserver listening to port ' + server.port)

    const pong = await new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://127.0.0.1:${server.port}`)
      ws.on('open', () => ws.send(MessageWrapper.encode({ Ping: {} }).finish()))
      ws.on('message', (data) => { ws.close(); resolve(MessageWrapper.decode(data)) })
      ws.on('error', reject)
    })
    expect(pong.kind).toBe('Pong')

    const response = await fetch(`http://127.0.0.1:${server.port}/ping`)
    expect(await response.text()).toBe('pong')
  } finally {
    server.kill('SIGTERM')
    await server.exited
  }
})

test('refuses to start without a world owner', async () => {
  const server = startServer({ JUNON_OWNER_UID: '' })
  expect(await server.exited).toBe(1)
  expect(server.output).toContain('JUNON_OWNER_UID is not defined')
})

test('local menu creates and reloads a world through loopback routes', async () => {
  const server = startServer({ JUNON_WORLD_ID: '', JUNON_OWNER_UID: '' })
  try {
    await waitForOutput(server, 'Webpage available')
    const base = `http://127.0.0.1:${server.clientPort}/local/`
    const ownerUid = '0123456789abcdef0123456789abcdef'
    const post = (route, body) => fetch(base + route, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    })

    let response = await fetch(base + 'worlds')
    expect((await response.json()).worlds).toEqual([])

    response = await post('worlds', { ownerUid, name: 'Menu World', gameMode: 'survival' })
    expect(response.status).toBe(200)
    const { worldId, serverUrl } = await response.json()
    expect(worldId).toMatch(/^[a-f0-9]{24}$/)
    expect(serverUrl).toBe(`ws://127.0.0.1:${server.port}`)

    response = await fetch(base + 'worlds')
    let listed = await response.json()
    expect(listed.activeWorldId).toBe(worldId)
    expect(listed.worlds[0].name).toBe('Menu World')

    response = await post('worlds/open', { worldId, ownerUid: 'ffffffffffffffffffffffffffffffff' })
    expect(response.status).toBe(400)

    response = await post('worlds/open', { worldId, ownerUid })
    expect(response.status).toBe(200)

    global.env = 'standalone'
    global.debugMode = false
    await WorldSerializer.initSerializer()
    const SaveState = WorldSerializer.getProtocolForVersion(39).SaveState
    const save = { metadata: { version: 39, uid: 'hosted', name: 'Imported World', gameMode: 'survival', rowCount: 128, colCount: 128 }, entities: { teams: {}, playerDataMap: { hostedUid: { uid: 'hostedUid', name: 'Alice', data: { uid: 'hostedUid', name: 'Alice' } } }, players: {} } }
    const bytes = zlib.gzipSync(SaveState.encode(SaveState.fromObject(save)).finish())
    response = await fetch(base + 'import/characters', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: bytes })
    expect(response.status).toBe(200)
    const characters = (await response.json()).characters
    expect(characters.map((entry) => entry.name)).toEqual(['Alice'])
    response = await fetch(base + 'import', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'X-Junon-Owner': ownerUid, 'X-Junon-Name': 'Player', 'X-Junon-Character': characters[0].uid }, body: bytes })
    expect(response.status).toBe(200)
    const imported = await response.json()
    expect(imported.name).toBe('Imported World')
    expect(fs.existsSync(path.join(savesDir, imported.worldId, 'sector.sav'))).toBe(true)

    response = await fetch(base + 'worlds', { headers: { Origin: 'https://example.com' } })
    expect(response.status).toBe(403)
  } finally {
    server.kill('SIGTERM')
    await server.exited
  }
})

// Co-op: the host opens the world on a second, all-interfaces port. Guests
// pass a protocol and password check, can't use the owner's profile, and are
// told why they are disconnected when hosting stops or the host quits.
test('hosts a world for co-op guests', async () => {
  const WebSocket = require('ws')
  const MessageWrapper = protobuf.loadSync(APP_PROTO).lookupType('app.MessageWrapper')

  const server = startServer({ JUNON_WORLD_ID: '', JUNON_OWNER_UID: '' })
  try {
    await waitForOutput(server, 'Webpage available')
    const base = `http://127.0.0.1:${server.clientPort}/local/`
    const ownerUid = '0123456789abcdef0123456789abcdef'
    const guestPort = randomPort()
    const post = (route, body) => fetch(base + route, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    })

    let response = await post('worlds', { ownerUid, name: 'Coop World', gameMode: 'survival' })
    const { worldId } = await response.json()

    // only the owner may host, on an unprivileged port
    response = await post('host', { worldId, ownerUid: 'ffffffffffffffffffffffffffffffff', port: guestPort, password: '' })
    expect(response.status).toBe(400)
    response = await post('host', { worldId, ownerUid, port: 80, password: '' })
    expect(response.status).toBe(400)

    response = await post('host', { worldId, ownerUid, port: guestPort, password: 'secret' })
    expect(response.status).toBe(200)
    expect((await response.json()).hosting).toMatchObject({ worldId, port: guestPort, hasPassword: true })
    response = await post('host', { worldId, ownerUid, port: guestPort + 1, password: '' })
    expect(response.status).toBe(400)

    response = await fetch(base + 'worlds')
    expect((await response.json()).hosting).toMatchObject({ worldId, port: guestPort })

    const guestBase = `http://127.0.0.1:${guestPort}`
    let info = await (await fetch(guestBase + '/info')).json()
    expect(info).toMatchObject({ worldName: 'Coop World', requiresPassword: true, passwordAccepted: false })
    expect(info.protocolHash).toMatch(/^[a-f0-9]{8}$/)
    info = await (await fetch(guestBase + '/info?password=secret')).json()
    expect(info.passwordAccepted).toBe(true)

    // the host's loopback socket needs no password
    info = await (await fetch(`http://127.0.0.1:${server.port}/info`)).json()
    expect(info.requiresPassword).toBe(false)

    const connect = (query) => new Promise((resolve) => {
      const ws = new WebSocket(`ws://127.0.0.1:${guestPort}/?${query}`)
      ws.messages = []
      ws.on('message', (data) => ws.messages.push(MessageWrapper.decode(data)))
      ws.closed = new Promise((closed) => ws.on('close', closed))
      ws.on('open', () => resolve(ws))
      ws.on('unexpected-response', (req, res) => resolve(res.statusCode))
      ws.on('error', () => {})
    })
    const waitForMessage = async (ws, kind) => {
      const deadline = Date.now() + 30_000
      while (Date.now() < deadline) {
        const message = ws.messages.find((entry) => entry.kind === kind)
        if (message) return message[kind]
        await new Promise((resolve) => setTimeout(resolve, 100))
      }
      throw new Error('no ' + kind + ' message, got ' + ws.messages.map((entry) => entry.kind).join(','))
    }
    const requestGame = (ws, uid, username) => {
      ws.send(MessageWrapper.encode({ RequestGame: { uid, username, screenWidth: 800, screenHeight: 600, sessionId: uid } }).finish())
    }

    const protocol = 'protocol=' + info.protocolHash
    expect(await connect('')).toBe(403)
    expect(await connect(protocol + '&password=wrong')).toBe(403)
    expect(await connect('protocol=00000000&password=secret')).toBe(403)

    // the owner's profile can't come in through the guest port
    const impostor = await connect(protocol + '&password=secret')
    requestGame(impostor, ownerUid, 'Impostor')
    expect((await waitForMessage(impostor, 'CantJoin')).message).toContain('owns the world')
    impostor.close()

    const guest = await connect(protocol + '&password=secret')
    requestGame(guest, 'guestProfile1234', 'Guest')
    expect((await waitForMessage(guest, 'JoinGame')).uid).toBe('guestProfile1234')

    // stopping disconnects guests with a reason, and closes the port
    response = await post('host/stop', {})
    expect(response.status).toBe(200)
    expect((await waitForMessage(guest, 'PlayerKick')).reason).toContain('stopped hosting')
    await guest.closed
    expect(await canConnect('127.0.0.1', guestPort)).toBe(false)

    // the guest's player is kept for a while and resumes when they rejoin
    response = await post('host', { worldId, ownerUid, port: guestPort, password: '' })
    expect(response.status).toBe(200)
    const returning = await connect(protocol)
    requestGame(returning, 'guestProfile1234', 'Guest')
    await waitForMessage(returning, 'SessionResume')

    // quitting the host notifies guests, then saves
    server.kill('SIGTERM')
    expect((await waitForMessage(returning, 'PlayerKick')).reason).toContain('closed the world')
    expect(await server.exited).toBe(0)
    const saved = await queryDatabase("select uid from users where uid = 'guestProfile1234'")
    expect(saved).toEqual([{ uid: 'guestProfile1234' }])
  } finally {
    server.kill('SIGTERM')
    await server.exited
  }
})
