// The signalling protocol, against both implementations: the Node server
// (src/signal_server.js) and the Cloudflare Worker (worker/index.mjs), which
// runs in workerd through Miniflare, with its Durable Objects and alarms.
const { describe, test, beforeEach, afterEach } = require('node:test')
const assert = require('node:assert')
const crypto = require('crypto')
const WebSocket = require('ws')
const SignalServer = require('../src/signal_server')
const { startSignalBackend } = require('../testing')

const PROTOCOL = 'abcd1234'
const DEFAULT_OPTIONS = { iceServers: [], helloTimeoutMs: 500 }

const BACKENDS = ['node', 'worker']

for (const backend of BACKENDS) {
  describe(backend, () => {
    let server

    const restart = async (options) => {
      if (server) await server.stop()
      server = await startSignalBackend(backend, Object.assign({}, DEFAULT_OPTIONS, options))
    }

    beforeEach(() => restart())
    afterEach(async () => {
      await server.stop()
      server = null
    })

    // a client that collects messages and can wait for the next one of a
    // type; the query is the one clients add for the Worker's routing
    function connect(role, code, version = 1) {
      const query = new URLSearchParams({ v: String(version), role: role })
      if (code) query.set('code', code)
      const ws = new WebSocket(server.url + '/?' + query)
      ws.messages = []
      ws.waiters = []
      ws.on('message', (data) => {
        const text = data.toString()
        const message = text === 'pong' ? { type: 'pong' } : JSON.parse(text)
        ws.messages.push(message)
        ws.waiters = ws.waiters.filter((waiter) => !waiter(message))
      })
      ws.closed = new Promise((resolve) => ws.on('close', (code) => resolve(code)))
      ws.opened = new Promise((resolve, reject) => { ws.on('open', resolve); ws.on('error', reject) })
      ws.next = (type) => new Promise((resolve) => {
        const found = ws.messages.find((message) => message.type === type && !message.taken)
        if (found) { found.taken = true; return resolve(found) }
        ws.waiters.push((message) => {
          if (message.type !== type) return false
          message.taken = true
          resolve(message)
          return true
        })
      })
      ws.sendJson = async (message) => { await ws.opened; ws.send(JSON.stringify(message)) }
      return ws
    }

    async function host(extra = {}) {
      const ws = connect('host', extra.code)
      await ws.sendJson(Object.assign({ type: 'host', version: 1, protocol: PROTOCOL, worldName: 'Moonbase' }, extra))
      ws.hosted = await ws.next('hosted')
      return ws
    }

    async function join(code) {
      const ws = connect('join', code)
      await ws.sendJson({ type: 'join', version: 1, code })
      return ws
    }

    test('normalizes room codes', () => {
      assert.strictEqual(SignalServer.normalizeCode('abcd-efgh'), 'ABCDEFGH')
      assert.strictEqual(SignalServer.normalizeCode(' ab cd ef gh '), 'ABCDEFGH')
      assert.strictEqual(SignalServer.normalizeCode('ABCDEFG'), null)
      assert.strictEqual(SignalServer.normalizeCode('ABCDEFG0'), null)
      assert.strictEqual(SignalServer.normalizeCode(42), null)
    })

    test('pairs a guest with the host and relays signals both ways', async () => {
      const hostWs = await host()
      assert.match(hostWs.hosted.code, /^[2-9A-HJKMNP-TV-Z]{8}$/)
      assert.deepStrictEqual(hostWs.hosted.iceServers, [])

      const lookup = connect('lookup', hostWs.hosted.code.toLowerCase())
      await lookup.sendJson({ type: 'lookup', version: 1, code: hostWs.hosted.code.toLowerCase() })
      assert.deepStrictEqual(await lookup.next('room'), { type: 'room', protocol: PROTOCOL, worldName: 'Moonbase', taken: true })
      await lookup.closed

      const guest = await join(hostWs.hosted.code.slice(0, 4) + '-' + hostWs.hosted.code.slice(4))
      const joined = await guest.next('joined')
      assert.strictEqual(joined.protocol, PROTOCOL)
      assert.strictEqual(joined.worldName, 'Moonbase')

      const peer = await hostWs.next('peer')
      await guest.sendJson({ type: 'signal', data: { sdp: { type: 'offer', sdp: 'v=0' } } })
      const offer = await hostWs.next('signal')
      assert.deepStrictEqual([offer.peerId, offer.data], [peer.peerId, { sdp: { type: 'offer', sdp: 'v=0' } }])

      await hostWs.sendJson({ type: 'signal', peerId: peer.peerId, data: { candidate: { candidate: 'x' } } })
      assert.deepStrictEqual((await guest.next('signal')).data, { candidate: { candidate: 'x' } })

      // signals to an unknown guest go nowhere; drop closes the guest
      await hostWs.sendJson({ type: 'signal', peerId: 'nobody', data: {} })
      await hostWs.sendJson({ type: 'drop', peerId: peer.peerId })
      await guest.closed
      assert.strictEqual((await hostWs.next('peerLeft')).peerId, peer.peerId)
      hostWs.close()
    })

    test('answers pings, before and after the hello', async () => {
      const ws = connect('host')
      await ws.opened
      ws.send('ping')
      await ws.next('pong')
      await ws.sendJson({ type: 'host', version: 1, protocol: PROTOCOL })
      await ws.next('hosted')
      ws.send('ping')
      await ws.next('pong')
      ws.close()
    })

    test('refuses wrong codes, and throttles an address that keeps guessing', async () => {
      await restart({ maxFailedLookups: 3 })
      const hostWs = await host()

      for (let i = 0; i < 3; i++) {
        const guess = await join('22222222')
        assert.strictEqual((await guess.next('error')).code, 'not_found')
        await guess.closed
      }

      // even the right code, now
      const guest = await join(hostWs.hosted.code)
      assert.strictEqual((await guest.next('error')).code, 'throttled')
      hostWs.close()
    })

    test('refuses other signalling versions and malformed messages', async () => {
      const old = connect('host', null, 0)
      await old.sendJson({ type: 'host', version: 0, protocol: PROTOCOL })
      assert.strictEqual((await old.next('error')).code, 'version')

      const garbage = connect('host')
      await garbage.opened
      garbage.send('not json')
      assert.strictEqual((await garbage.next('error')).code, 'bad_request')

      const badProtocol = connect('host')
      await badProtocol.sendJson({ type: 'host', version: 1, protocol: '<script>' })
      assert.strictEqual((await badProtocol.next('error')).code, 'bad_request')

      // a guest may only send signals
      const hostWs = await host()
      const guest = await join(hostWs.hosted.code)
      await guest.next('joined')
      await guest.sendJson({ type: 'drop', peerId: 'x' })
      assert.strictEqual((await guest.next('error')).code, 'bad_request')
      hostWs.close()

      // silence is refused too
      const silent = connect('host')
      assert.strictEqual((await silent.next('error')).code, 'bad_request')
    })

    test('a host reclaims its room after a dropped connection, with its token only', async () => {
      const first = await host()
      const { code, token } = first.hosted
      first.terminate()
      await first.closed

      // while the host is away, guests can't find the room
      const early = await join(code)
      assert.strictEqual((await early.next('error')).code, 'not_found')

      const thief = connect('host', code)
      await thief.sendJson({ type: 'host', version: 1, protocol: PROTOCOL, code, token: crypto.randomBytes(16).toString('hex') })
      assert.strictEqual((await thief.next('error')).code, 'bad_request')

      const back = await host({ code, token })
      assert.strictEqual(back.hosted.code, code)

      const guest = await join(code)
      await guest.next('joined')
      await back.next('peer')

      // the host leaving ends guests that are still connecting
      back.close()
      assert.strictEqual((await guest.next('error')).code, 'host_left')
    })

    test('a host whose room is gone gets a new code', async () => {
      const resumed = await host({ code: '22222222', token: 'f'.repeat(32) })
      assert.notStrictEqual(resumed.hosted.code, '22222222')
      resumed.close()
    })

    test('guests are let go after their lifetime, and a room expires after the resume window', async () => {
      await restart({ guestLifetimeMs: 300, roomResumeMs: 300 })
      const hostWs = await host()
      const { code, token } = hostWs.hosted

      const guest = await join(code)
      await guest.next('joined')
      await guest.closed
      await hostWs.next('peerLeft')

      hostWs.terminate()
      await hostWs.closed
      await new Promise((resolve) => setTimeout(resolve, 800))
      const late = await host({ code, token })
      assert.notStrictEqual(late.hosted.code, code)
      late.close()
    })

    test('limits rooms per address and hands out TURN credentials', async () => {
      await restart({ iceServers: [{ urls: 'stun:stun.example:3478' }], turn: { urls: ['turn:turn.example:3478'], secret: 's3cret', ttlSeconds: 600 }, maxRoomsPerAddress: 1 })

      const hostWs = await host()
      const [stun, turn] = hostWs.hosted.iceServers
      assert.deepStrictEqual(stun, { urls: 'stun:stun.example:3478' })
      assert.deepStrictEqual(turn.urls, ['turn:turn.example:3478'])
      assert.match(turn.username, /^\d+:junon$/)
      assert.strictEqual(turn.credential, crypto.createHmac('sha1', 's3cret').update(turn.username).digest('base64'))

      const second = connect('host')
      await second.sendJson({ type: 'host', version: 1, protocol: PROTOCOL })
      assert.strictEqual((await second.next('error')).code, 'full')
      hostWs.close()
    })
  })
}
