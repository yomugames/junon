import { DurableObject } from 'cloudflare:workers'
import {
  SIGNAL_PROTOCOL_VERSION, DEFAULT_ICE_SERVERS, PING, PONG, LIMITS, MESSAGES,
  normalizeCode, generateCode, isValidProtocol, isValidRoomDetails, cleanWorldName, isSignalData, iceServersWithTurn
} from '../src/protocol.mjs'

// The signalling server on Cloudflare: the protocol of src/signal_server.js
// (described there), with one Durable Object per room.
//
// The Worker is stateless: it reads the role and code from the URL query
// (?v=&role=&code=), checks the client's address against its AddressLimits
// object, and hands the WebSocket to the Room object named by the code, so a
// host and its guests end up in the same instance. Rooms use the WebSocket
// Hibernation API and keep nothing in memory between events: per-socket state
// is in socket attachments, the room in its storage, deadlines in one alarm.
// The host's keepalive (ping) is answered by Cloudflare without waking the
// room, so a hosted room costs almost nothing between joins.
//
// Differences from the Node server: hosts are limited by rooms opened per
// address per window, not rooms open at once; there is no per-address
// connection cap (Cloudflare's own protection applies); and a host whose
// keepalive has stopped for HOST_STALE_MS counts as gone when a guest arrives.
//
// Configuration (wrangler.toml [vars], secrets for TURN_SECRET):
//   ICE_SERVERS   JSON array of RTCIceServer, replacing the public STUN default
//   TURN_URLS     comma-separated turn: URLs, with TURN_SECRET (coturn
//                 use-auth-secret) and TURN_TTL seconds (default 3600)
//   and, mostly for tests: HELLO_TIMEOUT_MS, GUEST_LIFETIME_MS,
//   ROOM_RESUME_MS, MAX_FAILED_LOOKUPS, MAX_NEW_ROOMS_PER_ADDRESS,
//   NEW_ROOM_WINDOW_MS, HOST_STALE_MS

const NEW_ROOM_ATTEMPTS = 5

function config(env) {
  let number = (name, fallback) => Number(env[name]) > 0 ? Number(env[name]) : fallback
  return {
    iceServers: env.ICE_SERVERS ? JSON.parse(env.ICE_SERVERS) : DEFAULT_ICE_SERVERS,
    turn: env.TURN_URLS && env.TURN_SECRET ? {
      urls: env.TURN_URLS.split(',').map((url) => url.trim()).filter(Boolean),
      secret: env.TURN_SECRET,
      ttlSeconds: number('TURN_TTL', 3600)
    } : null,
    helloTimeoutMs: number('HELLO_TIMEOUT_MS', LIMITS.helloTimeoutMs),
    guestLifetimeMs: number('GUEST_LIFETIME_MS', LIMITS.guestLifetimeMs),
    roomResumeMs: number('ROOM_RESUME_MS', LIMITS.roomResumeMs),
    maxFailedLookups: number('MAX_FAILED_LOOKUPS', LIMITS.maxFailedLookups),
    failedLookupWindowMs: LIMITS.failedLookupWindowMs,
    maxNewRoomsPerAddress: number('MAX_NEW_ROOMS_PER_ADDRESS', 10),
    newRoomWindowMs: number('NEW_ROOM_WINDOW_MS', 10 * 60 * 1000),
    // the host page pings every 30 s
    hostStaleMs: number('HOST_STALE_MS', 90 * 1000)
  }
}

function randomBytes(length) {
  return crypto.getRandomValues(new Uint8Array(length))
}

function randomHex(length) {
  return Array.from(randomBytes(length), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

async function hmacSha1Base64(secret, text) {
  let encoder = new TextEncoder()
  let key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'])
  let signature = new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(text)))
  return btoa(String.fromCharCode(...signature))
}

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let difference = 0
  for (let i = 0; i < a.length; i++) difference |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return difference === 0
}

// a refusal before any room is involved: a socket that says why, then closes
function refuse(code, message) {
  let [client, server] = Object.values(new WebSocketPair())
  server.accept()
  server.send(JSON.stringify({ type: 'error', code: code, message: message }))
  server.close(1000)
  return new Response(null, { status: 101, webSocket: client })
}

export default {
  async fetch(request, env) {
    let url = new URL(request.url)
    if (url.pathname === '/health') return new Response('ok')
    if (request.method === 'GET' && url.pathname === '/rooms') {
      return env.DIRECTORY.get(env.DIRECTORY.idFromName('public')).fetch('http://internal/rooms')
    }
    if (request.headers.get('Upgrade') !== 'websocket') return new Response('Not found', { status: 404 })

    if (Number(url.searchParams.get('v')) !== SIGNAL_PROTOCOL_VERSION) return refuse('version', MESSAGES.version)

    let role = url.searchParams.get('role')
    let code = normalizeCode(url.searchParams.get('code'))
    let address = request.headers.get('CF-Connecting-IP') || 'unknown'
    let limits = env.LIMITS.get(env.LIMITS.idFromName(address))
    let toRoom = (roomCode, roomRole) => {
      let headers = new Headers(request.headers)
      headers.set('X-Junon-Role', roomRole)
      headers.set('X-Junon-Code', roomCode)
      return env.ROOMS.get(env.ROOMS.idFromName(roomCode)).fetch(new Request(request, { headers: headers }))
    }

    if (role === 'host') {
      // a host coming back to its room; an expired room gets a new code
      if (code) {
        let response = await toRoom(code, 'resume')
        if (response.status === 101) return response
      }

      if (!(await limits.allowNewRoom())) return refuse('full', MESSAGES.tooManyRooms)
      for (let attempt = 0; attempt < NEW_ROOM_ATTEMPTS; attempt++) {
        let response = await toRoom(generateCode(randomBytes), 'host')
        if (response.status === 101) return response
      }
      return refuse('full', MESSAGES.busy)
    }

    if (role === 'join' || role === 'lookup') {
      if (await limits.isThrottled()) return refuse('throttled', MESSAGES.throttled)

      let response = code ? await toRoom(code, role) : null
      if (response && response.status === 101) return response
      if (response && response.status === 429) return refuse('full', MESSAGES.roomFull)

      await limits.recordFailedLookup()
      return refuse('not_found', MESSAGES.notFound)
    }

    return refuse('bad_request', MESSAGES.unexpected)
  }
}

// The global public index stores only room codes. Every browse request checks
// the room object before returning metadata, so a stale or closed room cannot
// remain visible after a host disconnects.
export class Directory extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env)
    this.env = env
  }

  async fetch(request) {
    let url = new URL(request.url)
    if (request.method === 'PUT' && url.pathname.startsWith('/room/')) {
      await this.ctx.storage.put(url.pathname.slice(6), true)
      return new Response('ok')
    }
    if (request.method === 'DELETE' && url.pathname.startsWith('/room/')) {
      await this.ctx.storage.delete(url.pathname.slice(6))
      return new Response('ok')
    }
    if (request.method !== 'GET' || url.pathname !== '/rooms') return new Response('Not found', { status: 404 })

    let codes = await this.ctx.storage.list({ limit: 100 })
    let rooms = []
    for (let code of codes.keys()) {
      let response = await this.env.ROOMS.get(this.env.ROOMS.idFromName(code)).fetch('http://internal/directory-status')
      if (response.ok) rooms.push(await response.json())
      else await this.ctx.storage.delete(code)
    }
    return Response.json({ rooms: rooms }, { headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' } })
  }
}

// Per client address: wrong codes (against guessing) and rooms opened. Its
// alarm forgets everything once the windows are over.
export class AddressLimits extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env)
    this.config = config(env)
  }

  async count(key, windowMs) {
    let entry = await this.ctx.storage.get(key)
    if (!entry || Date.now() - entry.since > windowMs) return { count: 0, since: Date.now() }
    return entry
  }

  async bump(key, windowMs) {
    let entry = await this.count(key, windowMs)
    entry.count += 1
    await this.ctx.storage.put(key, entry)
    if (!(await this.ctx.storage.getAlarm())) await this.ctx.storage.setAlarm(Date.now() + Math.max(windowMs, this.config.newRoomWindowMs))
    return entry.count
  }

  async isThrottled() {
    return (await this.count('failedLookups', this.config.failedLookupWindowMs)).count >= this.config.maxFailedLookups
  }

  async recordFailedLookup() {
    await this.bump('failedLookups', this.config.failedLookupWindowMs)
  }

  async allowNewRoom() {
    return (await this.bump('newRooms', this.config.newRoomWindowMs)) <= this.config.maxNewRoomsPerAddress
  }

  async alarm() {
    await this.ctx.storage.deleteAll()
  }
}

// One room: its host, the guests connecting to it, and lookups. Sockets are
// tagged 'host', 'guest' plus 'peer:<peerId>', or 'lookup'; each has an
// attachment { role, peerId, isHello, helloBy, expiresAt, connectedAt,
// messageCount, messageWindowStart }. Storage holds 'room':
// { code, token, protocol, worldName, isPublic, details, hostGoneAt }.
export class Room extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env)
    this.env = env
    this.config = config(env)
    // answered by Cloudflare while the room hibernates
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair(PING, PONG))
  }

  // --- sockets ---

  sockets(tag) {
    return this.ctx.getWebSockets(tag).filter((ws) => {
      let attachment = ws.deserializeAttachment()
      return attachment && !attachment.isClosed
    })
  }

  // the host that said hello and still pings. A host gone quiet (its
  // connection half-open) doesn't count, so guests are told the room isn't
  // there rather than waiting on it; the host reclaims the room when it
  // reconnects.
  activeHost() {
    let now = Date.now()
    for (let ws of this.sockets('host')) {
      let attachment = ws.deserializeAttachment()
      if (!attachment.isHello) continue
      let lastPing = this.ctx.getWebSocketAutoResponseTimestamp(ws)
      let lastSeen = Math.max(lastPing ? lastPing.getTime() : 0, attachment.lastMessageAt || 0, attachment.connectedAt)
      if (now - lastSeen <= this.config.hostStaleMs) return ws
    }
    return null
  }

  send(ws, message) {
    try {
      ws.send(JSON.stringify(message))
    } catch (e) {
      // already closed
    }
  }

  close(ws) {
    let attachment = ws.deserializeAttachment()
    if (!attachment || attachment.isClosed) return false
    attachment.isClosed = true
    ws.serializeAttachment(attachment)
    try {
      ws.close(1000)
    } catch (e) {
      // already closed
    }
    return true
  }

  fail(ws, code, message) {
    this.send(ws, { type: 'error', code: code, message: message })
    this.close(ws)
  }

  // --- connecting (from the Worker) ---

  async fetch(request) {
    let role = request.headers.get('X-Junon-Role')
    let code = request.headers.get('X-Junon-Code')
    let room = await this.ctx.storage.get('room')

    if (request.method === 'GET' && new URL(request.url).pathname === '/directory-status') {
      if (!room || !room.isPublic || !this.activeHost()) return new Response('Not found', { status: 404 })
      return Response.json({ code: room.code, worldName: room.worldName, protocol: room.protocol, ...(room.details || {}) })
    }

    if (role === 'host' && (room || this.sockets('host').length > 0)) return new Response('Taken', { status: 409 })
    if (role === 'resume' && !room) return new Response('Gone', { status: 404 })
    if (role === 'join' || role === 'lookup') {
      if (!room || !this.activeHost()) return new Response('Not found', { status: 404 })
      if (role === 'join' && this.sockets('guest').length >= LIMITS.maxGuestsPerRoom) return new Response('Full', { status: 429 })
    }

    let now = Date.now()
    let isHost = role === 'host' || role === 'resume'
    let peerId = role === 'join' ? randomHex(8) : null
    let tags = isHost ? ['host'] : (peerId ? ['guest', 'peer:' + peerId] : ['lookup'])
    let [client, server] = Object.values(new WebSocketPair())
    this.ctx.acceptWebSocket(server, tags)
    server.serializeAttachment({
      role: isHost ? 'host' : role,
      code: code,
      peerId: peerId,
      isHello: false,
      isClosed: false,
      connectedAt: now,
      helloBy: now + this.config.helloTimeoutMs,
      expiresAt: peerId ? now + this.config.guestLifetimeMs : null,
      messageCount: 0,
      messageWindowStart: now
    })
    await this.scheduleAlarm()

    return new Response(null, { status: 101, webSocket: client })
  }

  // --- messages ---

  async webSocketMessage(ws, data) {
    let attachment = ws.deserializeAttachment()
    if (!attachment || attachment.isClosed) return

    let now = Date.now()
    if (now - attachment.messageWindowStart > LIMITS.messageWindowMs) {
      attachment.messageWindowStart = now
      attachment.messageCount = 0
    }
    attachment.messageCount += 1
    attachment.lastMessageAt = now
    ws.serializeAttachment(attachment)
    if (attachment.messageCount > LIMITS.maxMessages) return this.fail(ws, 'throttled', MESSAGES.tooManyMessages)

    if (typeof data !== 'string' || data.length > LIMITS.maxPayload) return this.fail(ws, 'bad_request', MESSAGES.malformed)
    // reaches here only when the room was awake anyway
    if (data === PING) return ws.send(PONG)

    let message
    try {
      message = JSON.parse(data)
    } catch (e) {
      return this.fail(ws, 'bad_request', MESSAGES.malformed)
    }
    if (!message || typeof message !== 'object' || typeof message.type !== 'string') return this.fail(ws, 'bad_request', MESSAGES.malformed)

    if (!attachment.isHello) return this.onHello(ws, attachment, message)
    if (attachment.role === 'host') return this.onHostMessage(ws, message)
    if (attachment.role === 'join') return this.onGuestMessage(ws, attachment, message)
  }

  async onHello(ws, attachment, message) {
    let expectedType = attachment.role === 'host' ? 'host' : attachment.role
    if (message.type !== expectedType) return this.fail(ws, 'bad_request', MESSAGES.unexpected)
    if (message.version !== SIGNAL_PROTOCOL_VERSION) return this.fail(ws, 'version', MESSAGES.version)

    attachment.isHello = true
    ws.serializeAttachment(attachment)

    if (attachment.role === 'host') return this.onHost(ws, attachment, message)

    let room = await this.ctx.storage.get('room')
    let host = this.activeHost()
    if (!room || !host) return this.fail(ws, 'not_found', MESSAGES.notFound)

    if (attachment.role === 'lookup') {
      this.send(ws, { type: 'room', protocol: room.protocol, worldName: room.worldName })
      this.close(ws)
      return
    }

    this.send(ws, { type: 'joined', protocol: room.protocol, worldName: room.worldName, iceServers: await this.iceServers() })
    this.send(host, { type: 'peer', peerId: attachment.peerId })
  }

  async onHost(ws, attachment, message) {
    if (!isValidProtocol(message.protocol)) return this.fail(ws, 'bad_request', MESSAGES.invalidProtocol)
    if (message.details !== undefined && !isValidRoomDetails(message.details)) return this.fail(ws, 'bad_request', MESSAGES.malformed)

    let room = await this.ctx.storage.get('room')
    if (room) {
      if (!timingSafeEqual(message.token, room.token)) return this.fail(ws, 'bad_request', MESSAGES.notYourRoom)
    } else {
      room = { code: attachment.code, token: randomHex(16) }
    }

    room.protocol = message.protocol
    room.worldName = cleanWorldName(message.worldName)
    room.isPublic = message.isPublic === true
    room.details = message.details || null
    room.hostGoneAt = null
    await this.ctx.storage.put('room', room)

    // a host coming back replaces its old connection, which may be half-open
    this.sockets('host').forEach((other) => {
      if (other !== ws) this.fail(other, 'host_left', MESSAGES.reclaimed)
    })

    this.send(ws, { type: 'hosted', code: room.code, token: room.token, iceServers: await this.iceServers() })
    await this.setDirectory(room)
    await this.scheduleAlarm()
  }

  async setDirectory(room) {
    let directory = this.env.DIRECTORY.get(this.env.DIRECTORY.idFromName('public'))
    await directory.fetch('http://internal/room/' + room.code, { method: room.isPublic && this.activeHost() ? 'PUT' : 'DELETE' })
  }

  async onHostMessage(ws, message) {
    if (message.type === 'details') {
      if (!isValidRoomDetails(message.details)) return this.fail(ws, 'bad_request', MESSAGES.malformed)
      let room = await this.ctx.storage.get('room')
      if (!room) return
      room.details = message.details
      await this.ctx.storage.put('room', room)
      return
    }
    if (message.type === 'visibility') {
      if (typeof message.isPublic !== 'boolean' || !Number.isSafeInteger(message.requestId) || message.requestId < 1) return this.fail(ws, 'bad_request', MESSAGES.malformed)
      let room = await this.ctx.storage.get('room')
      if (!room) return
      room.isPublic = message.isPublic
      await this.ctx.storage.put('room', room)
      await this.setDirectory(room)
      this.send(ws, { type: 'visibility', isPublic: room.isPublic, requestId: message.requestId })
      return
    }
    let guest = typeof message.peerId === 'string' && this.sockets('peer:' + message.peerId)[0]
    if (!guest) return

    if (message.type === 'signal' && isSignalData(message.data)) {
      this.send(guest, { type: 'signal', data: message.data })
    } else if (message.type === 'drop') {
      this.removeGuest(guest)
    }
  }

  onGuestMessage(ws, attachment, message) {
    if (message.type !== 'signal' || !isSignalData(message.data)) return this.fail(ws, 'bad_request', MESSAGES.unexpected)
    let host = this.activeHost()
    if (host) this.send(host, { type: 'signal', peerId: attachment.peerId, data: message.data })
  }

  // --- leaving ---

  // a guest that's done, whichever side ended it: the host hears of it
  removeGuest(ws) {
    let attachment = ws.deserializeAttachment()
    if (!this.close(ws) || !attachment.isHello) return
    let host = this.activeHost()
    if (host) this.send(host, { type: 'peerLeft', peerId: attachment.peerId })
  }

  async webSocketClose(ws) {
    let attachment = ws.deserializeAttachment()
    if (!attachment || attachment.isClosed) return this.close(ws)

    if (attachment.role === 'join') return this.removeGuest(ws)
    this.close(ws)
    if (attachment.role === 'host' && attachment.isHello) await this.onHostGone()
  }

  async webSocketError(ws) {
    await this.webSocketClose(ws)
  }

  // the host's connection ended: guests still connecting can't finish, and
  // the room waits a while for the host to come back
  async onHostGone() {
    if (this.sockets('host').some((ws) => ws.deserializeAttachment().isHello)) return

    let room = await this.ctx.storage.get('room')
    if (!room) return
    room.hostGoneAt = Date.now()
    await this.ctx.storage.put('room', room)
    await this.setDirectory(room)

    this.sockets('guest').forEach((guest) => this.fail(guest, 'host_left', MESSAGES.hostLeft))
    await this.scheduleAlarm()
  }

  // --- deadlines ---

  // one alarm for the earliest of: hellos due, guests' lifetimes, the room's
  // resume window
  async scheduleAlarm() {
    let deadlines = []
    this.sockets().forEach((ws) => {
      let attachment = ws.deserializeAttachment()
      if (!attachment.isHello) deadlines.push(attachment.helloBy)
      if (attachment.expiresAt) deadlines.push(attachment.expiresAt)
    })
    let room = await this.ctx.storage.get('room')
    if (room && room.hostGoneAt) deadlines.push(room.hostGoneAt + this.config.roomResumeMs)

    if (deadlines.length === 0) return this.ctx.storage.deleteAlarm()
    await this.ctx.storage.setAlarm(Math.min(...deadlines))
  }

  async alarm() {
    let now = Date.now()
    this.sockets().forEach((ws) => {
      let attachment = ws.deserializeAttachment()
      if (!attachment.isHello && attachment.helloBy <= now) {
        this.fail(ws, 'bad_request', MESSAGES.noHello)
      } else if (attachment.expiresAt && attachment.expiresAt <= now) {
        this.removeGuest(ws)
      }
    })

    let room = await this.ctx.storage.get('room')
    if (room && room.hostGoneAt && now - room.hostGoneAt >= this.config.roomResumeMs && !this.activeHost()) {
      // the code is free again
      await this.ctx.storage.deleteAll()
    }
    await this.scheduleAlarm()
  }

  iceServers() {
    return iceServersWithTurn(this.config.iceServers, this.config.turn, hmacSha1Base64)
  }
}
