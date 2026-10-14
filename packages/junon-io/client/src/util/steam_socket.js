// A Steam co-op guest's game socket. It has the part of the WebSocket API
// that GameConnection and SocketUtil use (onopen, onmessage, onerror,
// onclose, send, close, readyState, binaryType "arraybuffer"), and carries
// the traffic over Steam through the desktop app (preload.js ->
// packages/junon-desktop/src/steam_guest.js). The URL is
// steam:<host's Steam id>.

const KIND_TEXT = 0
const KIND_BINARY = 1

const CONNECTING = 0
const OPEN = 1
const CLOSED = 3

class SteamSocket {
  static isAvailable() {
    return !!(window.junonDesktop && window.junonDesktop.steam)
  }

  static isSteamUrl(url) {
    return /^steam:[0-9]{1,20}$/.test(url || "")
  }

  static urlFor(hostSteamId) {
    return "steam:" + hostSteamId
  }

  constructor(url) {
    this.url = url
    this.readyState = CONNECTING
    this.binaryType = "arraybuffer"

    let hostSteamId = url.replace(/^steam:/, "")
    let handlers = {
      onOpen: () => this.onOpen(),
      onMessage: (kind, data) => this.onMessage(kind, data),
      onClose: (reason, wasOpen) => this.onClose(reason, wasOpen)
    }

    window.junonDesktop.steam.openSocket(hostSteamId, window.protocolHash, handlers).then((channel) => {
      this.channel = channel
      if (this.readyState === CLOSED) channel.close()
    }).catch((e) => this.onClose(e.message, false))
  }

  onOpen() {
    if (this.readyState !== CONNECTING) return
    this.readyState = OPEN
    if (this.onopen) this.onopen({})
  }

  onMessage(kind, data) {
    if (this.readyState !== OPEN || !this.onmessage) return

    if (kind === KIND_BINARY) {
      // bytes arrive as a Uint8Array view; SocketUtil expects an ArrayBuffer
      data = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength)
    }
    this.onmessage({ data: data })
  }

  // reason: why the connection ended, e.g. the host's version mismatch
  onClose(reason, wasOpen) {
    if (this.readyState === CLOSED) return
    this.readyState = CLOSED
    this.closeReason = reason

    // like a WebSocket that failed to open: error, then close
    if (!wasOpen && this.onerror) this.onerror({ reason: reason })
    if (this.onclose) this.onclose({ reason: reason })
  }

  send(data) {
    if (this.readyState !== OPEN || !this.channel) return

    if (typeof data === "string") {
      this.channel.send(KIND_TEXT, data)
    } else {
      this.channel.send(KIND_BINARY, data instanceof ArrayBuffer ? new Uint8Array(data) : data)
    }
  }

  close() {
    if (this.readyState === CLOSED) return
    let wasOpen = this.readyState === OPEN
    if (this.channel) this.channel.close()
    this.onClose(null, wasOpen)
  }
}

module.exports = SteamSocket
