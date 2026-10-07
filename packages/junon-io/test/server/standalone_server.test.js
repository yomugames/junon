// Boots the real game server with NODE_ENV=standalone - no matchmaker, MySQL,
// Firebase or S3 - and checks the offline world lifecycle: a new world is
// generated, stopping the server saves it to the saves directory, and the next
// start loads that save instead of generating a new map.
const { spawn } = require('child_process')
const fs = require('fs')
const net = require('net')
const os = require('os')
const path = require('path')
const zlib = require('zlib')
const protobuf = require('protobufjs')

const SERVER_PATH = path.resolve(__dirname, '../../server/server.js')
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

  // name and mode now come from the save, not from the launcher
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

test('refuses to start without a world owner', async () => {
  const server = startServer({ JUNON_OWNER_UID: '' })
  expect(await server.exited).toBe(1)
  expect(server.output).toContain('JUNON_OWNER_UID is not defined')
})
