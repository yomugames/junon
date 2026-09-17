const { spawn } = require('child_process')
const net = require('net')
const fs = require('fs')
const path = require('path')

const IO_DIR = path.resolve(__dirname, '../..')
const MATCHMAKER_DIR = path.resolve(IO_DIR, '../junon-matchmaker')
const WORKSPACE_ROOT = path.resolve(IO_DIR, '../..')

// npm workspaces hoist shared devDependencies (gulp, playwright, etc) to the
// workspace root node_modules instead of packages/junon-io/node_modules
const GULP_BIN = path.join(WORKSPACE_ROOT, 'node_modules/.bin/gulp')

const MATCHMAKER_PORT = 3000
const GAME_SERVER_DEV_PORT = 8001
// default 8000 collides with an unrelated process on some hosts, and the
// game server (in debug mode) binds a literal port number with no retry -
// the actual player-facing game socket port is reported to the matchmaker
// dynamically, so a random high port avoids both that collision and reusing
// a port still being released by this harness's own previous run
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

// Boots the real matchmaker + real game server (as separate processes, exactly
// like local dev: `npm run matchmaker` + `npm run serveronly`) plus a gulp
// watcher for the real browser client, so Playwright drives the actual game
// end to end instead of a stubbed/mocked stack.
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

  fs.rmSync(CLIENT_BUNDLE, { force: true })

  const matchmaker = spawnProcess('matchmaker', 'node', ['src/index.js'], {
    cwd: MATCHMAKER_DIR,
    env: { ...process.env, NODE_ENV: 'test' }
  })
  await waitForPort(MATCHMAKER_PORT, '127.0.0.1', 30_000)

  const gulp = spawnProcess('gulp', GULP_BIN, [], {
    cwd: IO_DIR
  })
  await waitForFile(CLIENT_BUNDLE, 120_000)

  const gameServer = spawnProcess('game-server', 'node', [`--inspect=127.0.0.1:${INSPECT_PORT}`, 'server/server.js'], {
    cwd: IO_DIR,
    env: {
      ...process.env,
      NODE_ENV: 'test',
      // opts back into real matchmaker registration/heartbeat, which
      // NODE_ENV=test otherwise disables for Jest's benefit - see server.js
      JUNON_E2E_MATCHMAKER: 'true',
      // env==='test' isn't 'development', so server.js won't default this to
      // 127.0.0.1 itself - without it, the host handed back to the browser
      // for the second (game) socket connection would be malformed
      IP_ADDRESS: '127.0.0.1',
      // default 8000 is already bound by an unrelated process on some hosts;
      // pick a port dedicated to this harness instead
      PORT: String(GAME_WEBSOCKET_PORT)
    }
  })
  await waitForPort(GAME_SERVER_DEV_PORT, '127.0.0.1', 30_000)
  await waitForPort(INSPECT_PORT, '127.0.0.1', 30_000)

  // test workers are spawned after globalSetup and inherit this process's env,
  // which is how support/server_console.js finds the inspector
  process.env.JUNON_E2E_INSPECT_PORT = String(INSPECT_PORT)

  return async () => {
    for (const child of [gameServer, gulp, matchmaker]) {
      child.kill('SIGTERM')
    }

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
