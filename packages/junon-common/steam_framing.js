// Framing for game traffic carried over a Steam Networking Sockets connection
// (Steam co-op; see docs/exec-plans/active/steam-coop.md). A Steam message
// holds at most 512 KB, while a game socket frame can be up to 16 MB (the
// initial sector), so frames are split into fragments. Every message is sent
// reliably on one connection, which keeps them in order.
//
//   byte 0   frame kind: text, binary, or control (JSON, transport only)
//   byte 1   fragment: whole, first, middle, last
//   bytes 2+ payload
//
// Control frames never reach game code: the guest says hello with its
// protocol hash, and the host answers welcome or reject.

const KIND_TEXT = 0
const KIND_BINARY = 1
const KIND_CONTROL = 2

const FRAGMENT_WHOLE = 0
const FRAGMENT_FIRST = 1
const FRAGMENT_MIDDLE = 2
const FRAGMENT_LAST = 3

const HEADER_LENGTH = 2

// below Steam's k_cbMaxSteamNetworkingSocketsMessageSizeSend (512 KB)
const MAX_CHUNK_LENGTH = 500 * 1024

// the game socket's own limit (standalone_socket_server.js)
const MAX_FRAME_LENGTH = 16 * 1024 * 1024

// bumped when the framing or the control messages change incompatibly
const STEAM_TRANSPORT_VERSION = 1

// the Steam P2P virtual port the host listens on
const STEAM_VIRTUAL_PORT = 0

const SteamFraming = {
  KIND_TEXT,
  KIND_BINARY,
  KIND_CONTROL,
  MAX_CHUNK_LENGTH,
  MAX_FRAME_LENGTH,
  STEAM_TRANSPORT_VERSION,
  STEAM_VIRTUAL_PORT,

  // data: a string for text and control frames, bytes for binary ones.
  // Returns the Steam messages to send, in order.
  encode(kind, data, maxChunkLength = MAX_CHUNK_LENGTH) {
    if (kind !== KIND_TEXT && kind !== KIND_BINARY && kind !== KIND_CONTROL) throw new Error('Unknown frame kind ' + kind)

    let payload = typeof data === 'string' ? Buffer.from(data, 'utf8') : Buffer.from(data.buffer || data, data.byteOffset || 0, data.byteLength)
    if (payload.length > MAX_FRAME_LENGTH) throw new Error('Frame too large')

    if (payload.length <= maxChunkLength) return [SteamFraming.message(kind, FRAGMENT_WHOLE, payload)]

    let messages = []
    for (let offset = 0; offset < payload.length; offset += maxChunkLength) {
      let end = Math.min(offset + maxChunkLength, payload.length)
      let fragment = offset === 0 ? FRAGMENT_FIRST : (end === payload.length ? FRAGMENT_LAST : FRAGMENT_MIDDLE)
      messages.push(SteamFraming.message(kind, fragment, payload.subarray(offset, end)))
    }

    return messages
  },

  message(kind, fragment, payload) {
    let message = Buffer.allocUnsafe(HEADER_LENGTH + payload.length)
    message[0] = kind
    message[1] = fragment
    payload.copy(message, HEADER_LENGTH)
    return message
  },

  encodeControl(control) {
    return SteamFraming.encode(KIND_CONTROL, JSON.stringify(control))
  }
}

// Reassembles the messages of one connection. push() returns a frame
// ({ kind, data }; data is a string for text, a Buffer for binary, an object
// for control) once its last fragment arrives, else null. It throws on
// anything malformed: the peer is untrusted, and the caller closes the
// connection.
class SteamFrameAssembler {
  constructor(maxFrameLength = MAX_FRAME_LENGTH) {
    this.maxFrameLength = maxFrameLength
    this.reset()
  }

  reset() {
    this.kind = null
    this.chunks = []
    this.length = 0
  }

  push(message) {
    if (!message || message.length < HEADER_LENGTH) throw new Error('Malformed message')

    let kind = message[0]
    let fragment = message[1]
    let payload = message.subarray(HEADER_LENGTH)
    if (kind !== KIND_TEXT && kind !== KIND_BINARY && kind !== KIND_CONTROL) throw new Error('Unknown frame kind')

    let isInProgress = this.kind !== null
    if (fragment === FRAGMENT_WHOLE || fragment === FRAGMENT_FIRST) {
      if (isInProgress) throw new Error('Unfinished frame')
    } else if (fragment === FRAGMENT_MIDDLE || fragment === FRAGMENT_LAST) {
      if (!isInProgress || kind !== this.kind) throw new Error('Fragment without a frame')
    } else {
      throw new Error('Unknown fragment type')
    }

    if (this.length + payload.length > this.maxFrameLength) throw new Error('Frame too large')

    if (fragment === FRAGMENT_WHOLE) return SteamFrameAssembler.frame(kind, payload)

    this.kind = kind
    this.chunks.push(payload)
    this.length += payload.length
    if (fragment !== FRAGMENT_LAST) return null

    let data = Buffer.concat(this.chunks, this.length)
    this.reset()
    return SteamFrameAssembler.frame(kind, data)
  }

  static frame(kind, payload) {
    if (kind === KIND_BINARY) return { kind, data: Buffer.from(payload) }

    let text = payload.toString('utf8')
    if (kind === KIND_TEXT) return { kind, data: text }

    let control = JSON.parse(text)
    if (!control || typeof control !== 'object' || typeof control.type !== 'string') throw new Error('Malformed control frame')
    return { kind, data: control }
  }
}

// Steam's EResult values that sendMessage reports
const RESULT_OK = 1
const RESULT_LIMIT_EXCEEDED = 25

// a slow guest may fall this far behind before it is dropped
const MAX_QUEUED_BYTES = 64 * 1024 * 1024

// The outgoing messages of one connection. Steam refuses a reliable message
// with LimitExceeded while its send buffer (512 KB by default) is full, which
// a large frame such as the initial sector does on its own; the rest waits
// here and flush() retries on the next poll.
class SteamOutbox {
  // sendMessage(buffer) returns Steam's EResult
  constructor(sendMessage, maxQueuedBytes = MAX_QUEUED_BYTES) {
    this.sendMessage = sendMessage
    this.maxQueuedBytes = maxQueuedBytes
    this.queue = []
    this.queuedBytes = 0
  }

  // false once the queue overflows: close the connection
  enqueue(messages) {
    messages.forEach((message) => {
      this.queue.push(message)
      this.queuedBytes += message.length
    })
    return this.queuedBytes <= this.maxQueuedBytes
  }

  // 'sent' (queue empty), 'blocked' (retry later) or 'failed' (close)
  flush() {
    while (this.queue.length > 0) {
      let result = this.sendMessage(this.queue[0])
      if (result === RESULT_LIMIT_EXCEEDED) return 'blocked'
      if (result !== RESULT_OK) return 'failed'

      this.queuedBytes -= this.queue.shift().length
    }
    return 'sent'
  }

  isEmpty() {
    return this.queue.length === 0
  }
}

SteamFraming.SteamFrameAssembler = SteamFrameAssembler
SteamFraming.SteamOutbox = SteamOutbox

module.exports = SteamFraming
