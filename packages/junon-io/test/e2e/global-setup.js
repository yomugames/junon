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
module.exports = async () => {
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

  const gameServer = spawnProcess('game-server', 'node', ['server/server.js'], {
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

  return async () => {
    for (const child of [gameServer, gulp, matchmaker]) {
      child.kill('SIGTERM')
    }
  }
}
