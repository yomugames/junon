const crypto = require('crypto')
const http = require('http')
const WebSocket = require('ws')
const Protocol = require('./protocol.mjs')

// Pairs co-op hosts and guests for WebRTC (docs/exec-plans/active/webrtc-coop.md).
// A host opens a room and gets a short code; a guest who has the code reaches
// the host through the room, and the two exchange WebRTC offers, answers and
// ICE candidates here until their data channel is up. Game traffic never
// passes through this server, and nothing is stored.
//
// There are two implementations of this protocol: this Node server (for
// development, tests and self-hosting) and a Cloudflare Worker
// (worker/index.mjs); test/signal_server.test.js runs against both. What they
// share is in protocol.mjs.
//
// Clients add ?v=<version>&role=host|join|lookup&code=<code> to the URL
// (Protocol.signalUrl), which the Worker routes by; this server reads the
// first message instead. JSON text messages; the first one from a client says
// what it is:
//
//   host:   { type: 'host', version, protocol, worldName, code?, token?, isPublic?, details? }
//           -> { type: 'hosted', code, token, iceServers }
//           code and token reclaim the host's room after a dropped
//           connection; an expired room gets a new code, a wrong token an
//           error
//   guest:  { type: 'join', version, code }
//           -> { type: 'joined', protocol, worldName, iceServers }
//   check:  { type: 'lookup', version, code }
//           -> { type: 'room', protocol, worldName }, then closed
//
// Then, between a host and each of its guests (peerId names the guest):
//
//   to the host:    { type: 'peer', peerId }, { type: 'peerLeft', peerId },
//                   { type: 'signal', peerId, data }
//   from the host:  { type: 'signal', peerId, data }, { type: 'drop', peerId }
//                   { type: 'visibility', isPublic, requestId }
//           -> { type: 'visibility', isPublic, requestId }
//                   { type: 'details', details: { playerCount, maxPlayers, thumbnail } }
//   guest <-> here: { type: 'signal', data }
// GET /rooms lists at most 100 live public rooms as { rooms: [{ code,
// worldName, protocol, playerCount?, maxPlayers?, thumbnail? }] }.
// Private rooms still join by code. thumbnail is a bounded JPEG data URL.
//
// data is an object the peers define (an SDP description or a candidate). A
// refusal is { type: 'error', code, message } followed by a close; codes:
// version, not_found, full, throttled, bad_request, host_left. The text
// message 'ping' gets 'pong', at any time.
//
// The room code is the only key to a room, so failed lookups are limited per
// address, and a guest's connection here is short-lived.

const DEFAULTS = Object.assign({}, Protocol.LIMITS, {
  // ICE servers handed to both peers; TURN can be added here or through turn
  iceServers: Protocol.DEFAULT_ICE_SERVERS,
  // { urls, secret, ttlSeconds }: time-limited TURN credentials in the coturn
  // REST API format (use-auth-secret)
  turn: null,
  // behind a reverse proxy, read the client's address from X-Forwarded-For
  trustProxy: false,
  heartbeatMs: 30 * 1000,
  maxRooms: 10000,
  maxConnections: 20000,
  // rooms open at once per address
  maxRoomsPerAddress: 4,
  maxConnectionsPerAddress: 32
})

const hmacSha1Base64 = (secret, text) => crypto.createHmac('sha1', secret).update(text).digest('base64')

class SignalServer {
  constructor(options = {}) {
    this.options = Object.assign({}, DEFAULTS, options)
    // code -> { code, token, host, protocol, worldName, isPublic, address, guests: Map(peerId -> ws), expireTimer }
    this.rooms = new Map()
    this.connectionCounts = new Map()
    this.failedLookups = new Map()
    this.connectionCount = 0
  }

  static normalizeCode(code) {
    return Protocol.normalizeCode(code)
  }

  listen(port, host) {
    this.httpServer = http.createServer((req, res) => {
      if (req.method === 'GET' && req.url === '/rooms') {
        const rooms = Array.from(this.rooms.values()).filter((room) => room.host && room.isPublic)
          .slice(0, 100).map((room) => Object.assign({ code: room.code, worldName: room.worldName, protocol: room.protocol }, room.details || {}))
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' })
        return res.end(JSON.stringify({ rooms: rooms }))
      }
      res.writeHead(req.url === '/health' ? 200 : 404, { 'Content-Type': 'text/plain' })
      res.end(req.url === '/health' ? 'ok' : 'Not found')
    })
    this.wss = new WebSocket.Server({ server: this.httpServer, maxPayload: this.options.maxPayload })
    this.wss.on('connection', this.onConnection.bind(this))

    this.heartbeat = setInterval(() => this.checkHeartbeats(), this.options.heartbeatMs)

    return new Promise((resolve, reject) => {
      this.httpServer.once('error', reject)
      this.httpServer.listen(port, host, () => resolve(this.httpServer.address().port))
    })
  }

  close() {
    clearInterval(this.heartbeat)
    this.rooms.forEach((room) => clearTimeout(room.expireTimer))
    this.rooms.clear()
    this.wss.clients.forEach((ws) => ws.terminate())
    return new Promise((resolve) => this.wss.close(() => this.httpServer.close(() => resolve())))
  }

  clientAddress(req) {
    let forwarded = req.headers['x-forwarded-for']
    // the last entry is the one the proxy added
    if (this.options.trustProxy && typeof forwarded === 'string') return forwarded.split(',').pop().trim()
    return (req.socket.remoteAddress || '').replace(/^::ffff:/, '')
  }

  onConnection(ws, req) {
    let address = this.clientAddress(req)
    let perAddress = this.connectionCounts.get(address) || 0
    if (this.connectionCount >= this.options.maxConnections || perAddress >= this.options.maxConnectionsPerAddress) {
      ws.close(1013, 'Too many connections')
      return
    }

    this.connectionCount += 1
    this.connectionCounts.set(address, perAddress + 1)

    ws.junon = {
      address: address,
      role: null,
      room: null,
      peerId: null,
      isAlive: true,
      messageCount: 0,
      messageWindowStart: Date.now(),
      timer: setTimeout(() => this.fail(ws, 'bad_request', Protocol.MESSAGES.noHello), this.options.helloTimeoutMs)
    }

    ws.on('pong', () => { if (ws.junon) ws.junon.isAlive = true })
    ws.on('message', (data) => this.onMessage(ws, data))
    ws.on('close', () => this.onClose(ws))
    ws.on('error', () => {})
  }

  checkHeartbeats() {
    this.wss.clients.forEach((ws) => {
      if (!ws.junon) return
      if (!ws.junon.isAlive) return ws.terminate()
      ws.junon.isAlive = false
      ws.ping()
    })
  }

  isRateLimited(ws) {
    let state = ws.junon
    let now = Date.now()
    if (now - state.messageWindowStart > this.options.messageWindowMs) {
      state.messageWindowStart = now
      state.messageCount = 0
    }
    state.messageCount += 1
    return state.messageCount > this.options.maxMessages
  }

  async onMessage(ws, data) {
    if (!ws.junon) return
    let text = data.toString()
    if (text === Protocol.PING) return ws.send(Protocol.PONG)
    if (this.isRateLimited(ws)) return this.fail(ws, 'throttled', Protocol.MESSAGES.tooManyMessages)

    let message
    try {
      message = JSON.parse(text)
    } catch (e) {
      return this.fail(ws, 'bad_request', Protocol.MESSAGES.malformed)
    }
    if (!message || typeof message !== 'object' || typeof message.type !== 'string') return this.fail(ws, 'bad_request', Protocol.MESSAGES.malformed)

    let role = ws.junon.role
    if (!role) return this.onHello(ws, message)
    if (role === 'host') return this.onHostMessage(ws, message)
    if (role === 'guest') return this.onGuestMessage(ws, message)
  }

  async onHello(ws, message) {
    clearTimeout(ws.junon.timer)
    if (!['host', 'join', 'lookup'].includes(message.type)) return this.fail(ws, 'bad_request', Protocol.MESSAGES.unexpected)
    if (message.version !== Protocol.SIGNAL_PROTOCOL_VERSION) return this.fail(ws, 'version', Protocol.MESSAGES.version)

    if (message.type === 'host') return this.onHost(ws, message)

    if (this.isLookupThrottled(ws.junon.address)) return this.fail(ws, 'throttled', Protocol.MESSAGES.throttled)
    let code = Protocol.normalizeCode(message.code)
    let room = code && this.rooms.get(code)
    if (!room || !room.host) {
      this.recordFailedLookup(ws.junon.address)
      return this.fail(ws, 'not_found', Protocol.MESSAGES.notFound)
    }

    if (message.type === 'lookup') {
      this.send(ws, { type: 'room', protocol: room.protocol, worldName: room.worldName })
      ws.close(1000)
      return
    }

    if (room.guests.size >= this.options.maxGuestsPerRoom) return this.fail(ws, 'full', Protocol.MESSAGES.roomFull)

    let peerId = crypto.randomBytes(8).toString('hex')
    ws.junon.role = 'guest'
    ws.junon.room = room
    ws.junon.peerId = peerId
    ws.junon.timer = setTimeout(() => ws.close(1000), this.options.guestLifetimeMs)
    room.guests.set(peerId, ws)

    let iceServers = await this.getIceServers()
    this.send(ws, { type: 'joined', protocol: room.protocol, worldName: room.worldName, iceServers: iceServers })
    if (room.host) this.send(room.host, { type: 'peer', peerId: peerId })
  }

  async onHost(ws, message) {
    if (!Protocol.isValidProtocol(message.protocol)) return this.fail(ws, 'bad_request', Protocol.MESSAGES.invalidProtocol)
    if (message.details !== undefined && !Protocol.isValidRoomDetails(message.details)) return this.fail(ws, 'bad_request', Protocol.MESSAGES.malformed)

    let code = Protocol.normalizeCode(message.code)
    let room = code && this.rooms.get(code)
    if (room) {
      if (!this.isTokenValid(room, message.token)) return this.fail(ws, 'bad_request', Protocol.MESSAGES.notYourRoom)
      clearTimeout(room.expireTimer)
      if (room.host) this.fail(room.host, 'host_left', Protocol.MESSAGES.reclaimed)
    } else {
      if (this.rooms.size >= this.options.maxRooms) return this.fail(ws, 'full', Protocol.MESSAGES.busy)
      if (this.countRooms(ws.junon.address) >= this.options.maxRoomsPerAddress) return this.fail(ws, 'full', Protocol.MESSAGES.tooManyRooms)

      room = { code: this.generateCode(), token: crypto.randomBytes(16).toString('hex'), guests: new Map(), address: ws.junon.address }
      this.rooms.set(room.code, room)
    }

    room.host = ws
    room.protocol = message.protocol
    room.worldName = Protocol.cleanWorldName(message.worldName)
    room.isPublic = message.isPublic === true
    room.details = message.details || null
    ws.junon.role = 'host'
    ws.junon.room = room

    this.send(ws, { type: 'hosted', code: room.code, token: room.token, iceServers: await this.getIceServers() })
  }

  isTokenValid(room, token) {
    if (typeof token !== 'string' || token.length !== room.token.length) return false
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(room.token))
  }

  countRooms(address) {
    let count = 0
    this.rooms.forEach((room) => { if (room.address === address) count += 1 })
    return count
  }

  generateCode() {
    let code
    do {
      code = Protocol.generateCode(crypto.randomBytes)
    } while (this.rooms.has(code))
    return code
  }

  isLookupThrottled(address) {
    let failed = this.failedLookups.get(address)
    if (!failed) return false
    if (Date.now() - failed.since > this.options.failedLookupWindowMs) {
      this.failedLookups.delete(address)
      return false
    }
    return failed.count >= this.options.maxFailedLookups
  }

  recordFailedLookup(address) {
    let failed = this.failedLookups.get(address)
    if (!failed || Date.now() - failed.since > this.options.failedLookupWindowMs) {
      // forget old entries now and then, so the map doesn't grow without end
      if (this.failedLookups.size > 10000) this.failedLookups.clear()
      failed = { count: 0, since: Date.now() }
      this.failedLookups.set(address, failed)
    }
    failed.count += 1
  }

  onHostMessage(ws, message) {
    let room = ws.junon.room
    if (message.type === 'details') {
      if (!Protocol.isValidRoomDetails(message.details)) return this.fail(ws, 'bad_request', Protocol.MESSAGES.malformed)
      room.details = message.details
      return
    }
    if (message.type === 'visibility') {
      if (typeof message.isPublic !== 'boolean' || !Number.isSafeInteger(message.requestId) || message.requestId < 1) return this.fail(ws, 'bad_request', Protocol.MESSAGES.malformed)
      room.isPublic = message.isPublic
      this.send(ws, { type: 'visibility', isPublic: room.isPublic, requestId: message.requestId })
      return
    }
    let guest = typeof message.peerId === 'string' && room.guests.get(message.peerId)
    if (!guest) return

    if (message.type === 'signal' && Protocol.isSignalData(message.data)) {
      this.send(guest, { type: 'signal', data: message.data })
    } else if (message.type === 'drop') {
      guest.close(1000)
    }
  }

  onGuestMessage(ws, message) {
    let room = ws.junon.room
    if (message.type !== 'signal' || !Protocol.isSignalData(message.data)) return this.fail(ws, 'bad_request', Protocol.MESSAGES.unexpected)
    if (room.host) this.send(room.host, { type: 'signal', peerId: ws.junon.peerId, data: message.data })
  }

  onClose(ws) {
    let state = ws.junon
    if (!state) return
    ws.junon = null
    clearTimeout(state.timer)

    this.connectionCount -= 1
    let perAddress = (this.connectionCounts.get(state.address) || 1) - 1
    if (perAddress > 0) this.connectionCounts.set(state.address, perAddress)
    else this.connectionCounts.delete(state.address)

    let room = state.room
    if (!room) return

    if (state.role === 'guest') {
      room.guests.delete(state.peerId)
      if (room.host) this.send(room.host, { type: 'peerLeft', peerId: state.peerId })
    } else if (state.role === 'host' && room.host === ws) {
      // guests still connecting can't finish without the host
      room.host = null
      room.guests.forEach((guest) => this.fail(guest, 'host_left', Protocol.MESSAGES.hostLeft))
      room.expireTimer = setTimeout(() => {
        if (!room.host) this.rooms.delete(room.code)
      }, this.options.roomResumeMs)
      // the listening server keeps the process alive, not a room
      room.expireTimer.unref()
    }
  }

  getIceServers() {
    return Protocol.iceServersWithTurn(this.options.iceServers, this.options.turn, hmacSha1Base64)
  }

  send(ws, message) {
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(message))
  }

  fail(ws, code, message) {
    this.send(ws, { type: 'error', code: code, message: message })
    ws.close(1000)
  }
}

SignalServer.SIGNAL_PROTOCOL_VERSION = Protocol.SIGNAL_PROTOCOL_VERSION

module.exports = SignalServer
