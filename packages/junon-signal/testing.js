const path = require('path')
const SignalServer = require('./src/signal_server')

// Starts a signalling server for tests, on either implementation:
// 'node' (src/signal_server.js) or 'worker' (worker/index.mjs in workerd,
// through Miniflare). options are the Node server's; the Worker gets the ones
// it supports as bindings. Resolves to { url, stop() }.
async function startSignalBackend(backend, options = {}) {
  if (backend === 'node') {
    const server = new SignalServer(options)
    const port = await server.listen(0, '127.0.0.1')
    return { url: 'ws://127.0.0.1:' + port, stop: () => server.close() }
  }

  if (backend !== 'worker') throw new Error('Unknown signalling backend ' + backend)

  const bindings = {}
  if (options.iceServers) bindings.ICE_SERVERS = JSON.stringify(options.iceServers)
  if (options.helloTimeoutMs) bindings.HELLO_TIMEOUT_MS = String(options.helloTimeoutMs)
  if (options.maxFailedLookups) bindings.MAX_FAILED_LOOKUPS = String(options.maxFailedLookups)
  if (options.maxRoomsPerAddress) bindings.MAX_NEW_ROOMS_PER_ADDRESS = String(options.maxRoomsPerAddress)
  if (options.guestLifetimeMs) bindings.GUEST_LIFETIME_MS = String(options.guestLifetimeMs)
  if (options.roomResumeMs) bindings.ROOM_RESUME_MS = String(options.roomResumeMs)
  if (options.turn) {
    bindings.TURN_URLS = options.turn.urls.join(',')
    bindings.TURN_SECRET = options.turn.secret
    bindings.TURN_TTL = String(options.turn.ttlSeconds)
  }

  // only needed for this backend
  const { Miniflare } = require('miniflare')
  const mf = new Miniflare({
    modules: true,
    scriptPath: path.join(__dirname, 'worker/index.mjs'),
    modulesRoot: __dirname,
    compatibilityDate: '2026-07-01',
    durableObjects: { ROOMS: 'Room', LIMITS: 'AddressLimits' },
    bindings: bindings
  })
  const url = await mf.ready
  return { url: url.href.replace(/^http/, 'ws').replace(/\/$/, ''), stop: () => mf.dispose() }
}

module.exports = { startSignalBackend }
