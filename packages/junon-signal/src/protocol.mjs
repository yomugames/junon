// What the two signalling backends share: the Node server
// (signal_server.js, for development, tests and self-hosting) and the
// Cloudflare Worker (worker/index.mjs). The protocol itself is described at
// the top of signal_server.js. ES module, so the Worker can import it; Node
// loads it with require().

export const SIGNAL_PROTOCOL_VERSION = 1

// no 0/O, 1/I/L or U, which are easy to misread or mistype
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ'
export const CODE_LENGTH = 8

export const DEFAULT_ICE_SERVERS = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }]

// a text message, not JSON: clients send it to keep the connection alive
// and get PONG back (on Cloudflare without waking the room)
export const PING = 'ping'
export const PONG = 'pong'

export const LIMITS = {
  maxPayload: 16 * 1024,
  maxRoomThumbnailBase64: 8192,
  helloTimeoutMs: 10 * 1000,
  // a guest only needs the room until its data channel is open
  guestLifetimeMs: 60 * 1000,
  // a host whose connection dropped can reclaim its room for this long
  roomResumeMs: 2 * 60 * 1000,
  maxGuestsPerRoom: 16,
  // wrong codes per address per window, before lookups are refused
  maxFailedLookups: 20,
  failedLookupWindowMs: 60 * 1000,
  // messages per connection per window
  maxMessages: 200,
  messageWindowMs: 10 * 1000
}

export function isValidRoomDetails(details) {
  if (!details || typeof details !== 'object' || Array.isArray(details)) return false
  if (Object.keys(details).some((key) => !['playerCount', 'maxPlayers', 'thumbnail'].includes(key))) return false
  if (!Number.isInteger(details.playerCount) || details.playerCount < 0 || details.playerCount > 100) return false
  if (!Number.isInteger(details.maxPlayers) || details.maxPlayers < 1 || details.maxPlayers > 100) return false
  if (details.playerCount > details.maxPlayers) return false
  if (details.thumbnail === null) return true
  if (typeof details.thumbnail !== 'string' || details.thumbnail.length > LIMITS.maxRoomThumbnailBase64 + 23) return false
  if (!details.thumbnail.startsWith('data:image/jpeg;base64,')) return false
  const base64 = details.thumbnail.slice(23)
  return base64.length > 0 && base64.length <= LIMITS.maxRoomThumbnailBase64 && base64.length % 4 === 0 && /^[A-Za-z0-9+/]+={0,2}$/.test(base64)
}

export const MESSAGES = {
  version: 'This version of Junon can\'t use the co-op service. Update the game.',
  noHello: 'No hello.',
  malformed: 'Malformed message.',
  unexpected: 'Unexpected message.',
  invalidProtocol: 'Invalid protocol.',
  notFound: 'No world is being hosted with that code. Check the code with the host.',
  throttled: 'Too many wrong room codes. Wait a minute and try again.',
  tooManyMessages: 'Too many messages.',
  roomFull: 'Too many players are joining this world right now. Try again in a moment.',
  busy: 'The co-op service is busy. Try again later.',
  tooManyRooms: 'Too many worlds are hosted from your address.',
  notYourRoom: 'This room belongs to another host.',
  reclaimed: 'The room was reclaimed.',
  hostLeft: 'The host left.'
}

export function normalizeCode(code) {
  if (typeof code !== 'string') return null
  let normalized = code.toUpperCase().replace(/[\s-]/g, '')
  if (normalized.length !== CODE_LENGTH) return null
  for (let i = 0; i < normalized.length; i++) {
    if (!CODE_ALPHABET.includes(normalized[i])) return null
  }
  return normalized
}

// randomBytes(n): n random bytes (Node's crypto, or the Web Crypto API)
export function generateCode(randomBytes) {
  let bytes = randomBytes(CODE_LENGTH)
  let code = ''
  // 256 isn't a multiple of 30; the bias is too small to matter here
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length]
  return code
}

export function isValidProtocol(protocol) {
  return typeof protocol === 'string' && /^[a-f0-9]{8}$/.test(protocol)
}

export function cleanWorldName(worldName) {
  return typeof worldName === 'string' ? worldName.slice(0, 64) : ''
}

export function isSignalData(data) {
  return !!data && typeof data === 'object' && !Array.isArray(data)
}

// The query a client adds to the signalling URL, so a router (the Worker)
// can send it to its room before the first message:
// ?v=<version>&role=host|join|lookup&code=<code>
export function signalUrl(baseUrl, role, code) {
  let url = new URL(baseUrl)
  url.searchParams.set('v', String(SIGNAL_PROTOCOL_VERSION))
  url.searchParams.set('role', role)
  if (code) url.searchParams.set('code', code)
  return url.toString()
}

// The TURN credentials both backends hand out, in the coturn REST API
// format (use-auth-secret). hmacSha1Base64(secret, text) may be async.
export async function iceServersWithTurn(iceServers, turn, hmacSha1Base64) {
  let servers = iceServers.slice()
  if (turn && turn.secret && turn.urls && turn.urls.length) {
    let expiresAt = Math.floor(Date.now() / 1000) + (turn.ttlSeconds || 3600)
    let username = expiresAt + ':junon'
    servers.push({ urls: turn.urls, username: username, credential: await hmacSha1Base64(turn.secret, username) })
  }
  return servers
}
