const { spawn } = require('child_process')
const net = require('net')
const fs = require('fs')
const os = require('os')
const path = require('path')

const IO_DIR = path.resolve(__dirname, '../..')
const WORKSPACE_ROOT = path.resolve(IO_DIR, '../..')

// npm workspaces hoist shared devDependencies (gulp, playwright, etc) to the
// workspace root node_modules instead of packages/junon-io/node_modules
const GULP_BIN = path.join(WORKSPACE_ROOT, 'node_modules/.bin/gulp')

// the page server; playwright.config.js's baseURL points here
const GAME_SERVER_DEV_PORT = parseInt(process.env.JUNON_E2E_CLIENT_PORT || '8001', 10)
// default 8000 collides with an unrelated process on some hosts, and the
// game server binds a literal port number with no retry - the local menu
// learns the socket port from the server, so a random high port avoids both
// that collision and reusing a port still being released by this harness's
// own previous run
const GAME_WEBSOCKET_PORT = 20_000 + Math.floor(Math.random() * 20_000)
// The harness sets up scenarios by attaching to the game server's V8 inspector
// over the Chrome DevTools Protocol (see support/server_console.js), which is
// how it reaches real server-side game state without the game shipping any
// test-only debug hooks. `npm start` already runs the server under --inspect;
// this just pins a known port instead of the default 9229, which a stray
// node --inspect (or a previous run still shutting down) may already hold.
const INSPECT_PORT = 40_000 + Math.floor(Math.random() * 10_000)
const CLIENT_BUNDLE = path.join(IO_DIR, 'client/dist/app.js')

function waitForPort(port, host, timeoutMs) {
  const deadline = Date.now() + timeoutMs

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const socket = net.createConnection({ port, host })
      socket.once('connect', () => {
        socket.end()
        resolve()
      })
      socket.once('error', () => {
        socket.destroy()
        if (Date.now() > deadline) {
          reject(new Error(`Timed out waiting for ${host}:${port}`))
        } else {
          setTimeout(attempt, 300)
        }
      })
    }

    attempt()
  })
}

function isPortInUse(port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host: '127.0.0.1' })
    socket.once('connect', () => { socket.end(); resolve(true) })
    socket.once('error', () => { socket.destroy(); resolve(false) })
  })
}

function waitForFile(filePath, timeoutMs) {
  const deadline = Date.now() + timeoutMs

  return new Promise((resolve, reject) => {
    const check = () => {
      if (fs.existsSync(filePath)) return resolve()
      if (Date.now() > deadline) return reject(new Error(`Timed out waiting for ${filePath}`))
      setTimeout(check, 300)
    }

    check()
  })
}

function spawnProcess(name, command, args, opts) {
  const child = spawn(command, args, { stdio: 'pipe', ...opts })

  child.stdout.on('data', (data) => process.stdout.write(`[${name}] ${data}`))
  child.stderr.on('data', (data) => process.stderr.write(`[${name}] ${data}`))
  child.on('error', (err) => console.error(`[${name}] failed to start: ${err.message}`))

  return child
}

// Boots the real game server (as `npm run server` does, with no world loaded,
// so tests create theirs through the local menu) plus a gulp watcher for the
// real browser client, so Playwright drives the actual game end to end
// instead of a stubbed/mocked stack.
module.exports = async (config) => {
  // resolved by playwright.config.js (defaults to /tmp/junon-io-e2e). Printed
  // up front so it's known before anything fails, and again on the way out
  // with whatever was actually produced - videos in particular are only kept
  // on a passing run when JUNON_E2E_VIDEO is set, and a path scrolled off the
  // top of a noisy boot log is no use.
  const outputDir = (config && config.projects && config.projects[0] && config.projects[0].outputDir) ||
                    process.env.JUNON_E2E_OUTPUT_DIR ||
                    '/tmp/junon-io-e2e'

  console.log(`[e2e] artifacts (video/trace/screenshots): ${outputDir}`)

  // waitForPort below can't tell our page server from another process on the
  // same port, which would leave every test failing on a page that isn't ours
  if (await isPortInUse(GAME_SERVER_DEV_PORT)) {
    throw new Error(`Port ${GAME_SERVER_DEV_PORT} is already in use. Stop that process or set JUNON_E2E_CLIENT_PORT.`)
  }

  fs.rmSync(CLIENT_BUNDLE, { force: true })
  const savesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'junon-e2e-saves-'))

  const gulp = spawnProcess('gulp', GULP_BIN, [], {
    cwd: IO_DIR
  })
  await waitForFile(CLIENT_BUNDLE, 120_000)

  const gameServer = spawnProcess('game-server', 'node', [`--inspect=127.0.0.1:${INSPECT_PORT}`, 'server/server.js'], {
    cwd: IO_DIR,
    env: {
      ...process.env,
      // debugMode gameplay (fast building, admin mode), as the specs expect
      NODE_ENV: 'test',
      JUNON_SAVES_DIR: savesDir,
      JUNON_WORLD_ID: '',
      JUNON_OWNER_UID: '',
      PORT: String(GAME_WEBSOCKET_PORT),
      JUNON_CLIENT_PORT: String(GAME_SERVER_DEV_PORT)
    }
  })
  await waitForPort(GAME_SERVER_DEV_PORT, '127.0.0.1', 30_000)
  await waitForPort(INSPECT_PORT, '127.0.0.1', 30_000)

  // test workers are spawned after globalSetup and inherit this process's env,
  // which is how support/server_console.js finds the inspector
  process.env.JUNON_E2E_INSPECT_PORT = String(INSPECT_PORT)

  return async () => {
    // the server saves its world on SIGTERM; let it finish before the saves
    // directory goes away
    const serverExited = new Promise((resolve) => {
      if (gameServer.exitCode !== null) return resolve()
      gameServer.once('exit', resolve)
      setTimeout(resolve, 30_000)
    })
    for (const child of [gameServer, gulp]) {
      child.kill('SIGTERM')
    }
    await serverExited
    fs.rmSync(savesDir, { recursive: true, force: true })

    reportArtifacts(outputDir)
  }
}

function reportArtifacts(outputDir) {
  const artifacts = listFilesRecursive(outputDir)
    // .last-run.json is playwright's own bookkeeping, not something to go look at
    .filter((file) => path.basename(file) !== '.last-run.json')

  if (artifacts.length === 0) {
    console.log(`[e2e] artifacts: ${outputDir} (none kept - runs that pass keep nothing unless JUNON_E2E_VIDEO=on)`)
    return
  }

  console.log(`[e2e] artifacts in ${outputDir}:`)
  for (const file of artifacts) {
    const sizeKb = Math.round(fs.statSync(file).size / 1024)
    console.log(`[e2e]   ${file} (${sizeKb}KB)`)
  }
}

function listFilesRecursive(dir) {
  let entries
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true })
  } catch (err) {
    return [] // never let artifact reporting fail a run
  }

  return entries.flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? listFilesRecursive(full) : [full]
  })
}
