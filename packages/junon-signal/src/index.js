const SignalServer = require('./signal_server')

// Configuration (see docs/development.md#webrtc-co-op):
//   JUNON_SIGNAL_PORT         port to listen on (default 8787)
//   JUNON_SIGNAL_HOST         address to listen on (default 0.0.0.0)
//   JUNON_SIGNAL_TRUST_PROXY  1 behind a reverse proxy that sets X-Forwarded-For
//   JUNON_SIGNAL_ICE_SERVERS  JSON array of RTCIceServer, replacing the
//                             default public STUN servers
//   JUNON_SIGNAL_TURN_URLS    comma-separated turn: URLs, with
//   JUNON_SIGNAL_TURN_SECRET  the TURN server's shared secret (coturn
//                             use-auth-secret); credentials last
//   JUNON_SIGNAL_TURN_TTL     this many seconds (default 3600)
function readOptions(env) {
  let options = { trustProxy: env.JUNON_SIGNAL_TRUST_PROXY === '1' }

  if (env.JUNON_SIGNAL_ICE_SERVERS) {
    options.iceServers = JSON.parse(env.JUNON_SIGNAL_ICE_SERVERS)
    if (!Array.isArray(options.iceServers)) throw new Error('JUNON_SIGNAL_ICE_SERVERS must be a JSON array')
  }

  if (env.JUNON_SIGNAL_TURN_URLS && env.JUNON_SIGNAL_TURN_SECRET) {
    options.turn = {
      urls: env.JUNON_SIGNAL_TURN_URLS.split(',').map((url) => url.trim()).filter(Boolean),
      secret: env.JUNON_SIGNAL_TURN_SECRET,
      ttlSeconds: Number(env.JUNON_SIGNAL_TURN_TTL) || 3600
    }
  }

  return options
}

async function main() {
  let server = new SignalServer(readOptions(process.env))
  let port = await server.listen(Number(process.env.JUNON_SIGNAL_PORT) || 8787, process.env.JUNON_SIGNAL_HOST || '0.0.0.0')
  console.log('Junon signalling server listening on port ' + port)

  const shutdown = () => server.close().then(() => process.exit(0))
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)
}

main().catch((e) => {
  console.error(e.message)
  process.exit(1)
})
