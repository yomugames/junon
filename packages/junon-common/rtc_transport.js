// Constants shared by the three sides of WebRTC co-op
// (docs/exec-plans/active/webrtc-coop.md): the guest's game socket
// (junon-io client/src/util/rtc_socket.js), the host's peer connections
// (junon-desktop src/rtc_host.js) and the game server's guest sockets
// (junon-io server/util/rtc_socket_bridge.js). Game frames cross the data
// channel in the Steam co-op framing (steam_framing.js), in smaller pieces.

// bumped when the framing, chunking or control messages change incompatibly
const RTC_TRANSPORT_VERSION = 1

// the signalling server's protocol (packages/junon-signal/src/signal_server.js)
const SIGNAL_PROTOCOL_VERSION = 1

// every Chromium accepts data channel messages of this size
const RTC_CHUNK_LENGTH = 64 * 1024

// the one data channel between a guest and the host: reliable and ordered
const RTC_CHANNEL_LABEL = 'junon'

// the signalling server's room code alphabet: no 0/O, 1/I/L or U
const ROOM_CODE_PATTERN = /^[2-9A-HJKMNP-TV-Z]{8}$/

const RtcTransport = {
  RTC_TRANSPORT_VERSION,
  SIGNAL_PROTOCOL_VERSION,
  RTC_CHUNK_LENGTH,
  RTC_CHANNEL_LABEL,

  // what a player typed, e.g. "k7qf-2m9x", as the code itself, or null
  normalizeRoomCode(code) {
    if (typeof code !== 'string') return null
    let normalized = code.toUpperCase().replace(/[\s-]/g, '')
    return ROOM_CODE_PATTERN.test(normalized) ? normalized : null
  },

  // K7QF2M9X -> K7QF-2M9X
  formatRoomCode(code) {
    return code.slice(0, 4) + '-' + code.slice(4)
  },

  // the signalling server's URL for a role ('host', 'join' or 'lookup'),
  // with the query its Cloudflare Worker routes by (junon-signal's
  // protocol.mjs signalUrl, which the host window repeats)
  signalUrl(baseUrl, role, code) {
    let url = new URL(baseUrl)
    url.searchParams.set('v', String(SIGNAL_PROTOCOL_VERSION))
    url.searchParams.set('role', role)
    if (code) url.searchParams.set('code', code)
    return url.toString()
  }
}

module.exports = RtcTransport
