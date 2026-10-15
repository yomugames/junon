const SteamFraming = require('junon-common/steam_framing')

// Co-op guests whose connections the desktop shell's main process owns, Steam
// (steam_socket_bridge.js) or WebRTC (rtc_socket_bridge.js). Main relays
// whole frames over the desktop channel, in messages named after the
// transport (here for prefix 'steam'):
//
//   from main: steamOpen { connectionId, ...the guest's identity }
//              steamFrame { connectionId, kind, data }
//              steamClose { connectionId }
//   to main:   steamFrame { connectionId, kind, data }
//              steamClose { connectionId, isGraceful }
//
// Each accepted connection becomes a RelayGuestSocket, with the
// StandaloneSocket shape that SocketUtil, Game and Player use, and joins the
// socket server's set, so idle closing and the hosting kick loop apply. The
// guest's first frame must be a control hello with the transport version and
// protocol hash; nothing reaches the game before it.

const HELLO_TIMEOUT_MS = 15 * 1000

class RelayGuestSocket {
  // identity: what describeGuest returned (remoteAddress and transport flags)
  constructor(bridge, connectionId, identity) {
    Object.assign(this, identity)
    this.bridge = bridge
    this.connectionId = connectionId
    this.isGuest = true
    this.lastMessageTime = Date.now()
  }

  send(data, isBinary) {
    this.bridge.sendFrame(this, isBinary ? SteamFraming.KIND_BINARY : SteamFraming.KIND_TEXT, data)
  }

  close() {
    this.bridge.closeSocket(this, false)
  }

  // graceful close: frames sent before it are delivered first
  end() {
    this.bridge.closeSocket(this, true)
  }
}

class RelaySocketBridge {
  // options: { postMessage(message), sockets (the socket server's Set),
  // handlers: { open(socket), message(socket, data, isBinary), close(socket) },
  // protocolHash, isAccepting() }
  constructor(options, prefix, transportVersion) {
    this.postMessage = options.postMessage
    this.sockets = options.sockets
    this.handlers = options.handlers
    this.protocolHash = options.protocolHash
    this.isAccepting = options.isAccepting
    this.transportVersion = transportVersion

    this.types = { open: prefix + 'Open', frame: prefix + 'Frame', close: prefix + 'Close' }
    this.pending = new Map()
    this.connections = new Map()
  }

  // the guest socket's identity fields for an open message from main, or
  // null to refuse it
  describeGuest(message) {
    throw new Error('not implemented')
  }

  isBridgeMessage(message) {
    return !!message && (message.type === this.types.open || message.type === this.types.frame || message.type === this.types.close)
  }

  // returns false for messages that aren't the bridge's
  handle(message) {
    if (!this.isBridgeMessage(message)) return false
    if (!Number.isInteger(message.connectionId)) return true

    if (message.type === this.types.open) this.onOpen(message.connectionId, message)
    if (message.type === this.types.frame) this.onFrame(message.connectionId, message.kind, message.data)
    if (message.type === this.types.close) this.onClose(message.connectionId)
    return true
  }

  onOpen(connectionId, message) {
    if (this.pending.has(connectionId) || this.connections.has(connectionId)) return
    let identity = this.isAccepting() ? this.describeGuest(message) : null
    if (!identity) {
      this.postMessage({ type: this.types.close, connectionId: connectionId, isGraceful: false })
      return
    }

    let timeout = setTimeout(() => this.reject(connectionId, 'No hello from the guest.'), HELLO_TIMEOUT_MS)
    this.pending.set(connectionId, { identity: identity, timeout: timeout })
  }

  onFrame(connectionId, kind, data) {
    let pending = this.pending.get(connectionId)
    if (pending) return this.onHello(connectionId, pending, kind, data)

    let socket = this.connections.get(connectionId)
    if (!socket) return

    socket.lastMessageTime = Date.now()
    if (kind === SteamFraming.KIND_TEXT && typeof data === 'string') {
      this.handlers.message(socket, data, false)
    } else if (kind === SteamFraming.KIND_BINARY && data instanceof Uint8Array) {
      this.handlers.message(socket, Buffer.from(data.buffer, data.byteOffset, data.byteLength), true)
    } else {
      // control frames end with the hello
      socket.close()
    }
  }

  onHello(connectionId, pending, kind, data) {
    let isHello = kind === SteamFraming.KIND_CONTROL && data && data.type === 'hello'
    if (!isHello) return this.reject(connectionId, 'Unexpected message before hello.')

    if (data.version !== this.transportVersion || data.protocol !== this.protocolHash) {
      return this.reject(connectionId, 'Version mismatch: the host runs a different version of Junon. Both players need the same version.', 'version')
    }

    clearTimeout(pending.timeout)
    this.pending.delete(connectionId)
    if (!this.isAccepting()) return this.reject(connectionId, 'The world is no longer being hosted.')

    let socket = new RelayGuestSocket(this, connectionId, pending.identity)
    this.connections.set(connectionId, socket)
    this.sockets.add(socket)

    this.sendFrame(socket, SteamFraming.KIND_CONTROL, { type: 'welcome' })
    this.handlers.open(socket)
  }

  // a connection that never became a socket
  reject(connectionId, reason, code) {
    let pending = this.pending.get(connectionId)
    if (!pending) return

    clearTimeout(pending.timeout)
    this.pending.delete(connectionId)
    this.postMessage({ type: this.types.frame, connectionId: connectionId, kind: SteamFraming.KIND_CONTROL, data: { type: 'reject', reason: reason, code: code || 'refused' } })
    this.postMessage({ type: this.types.close, connectionId: connectionId, isGraceful: true })
  }

  onClose(connectionId) {
    let pending = this.pending.get(connectionId)
    if (pending) {
      clearTimeout(pending.timeout)
      this.pending.delete(connectionId)
    }

    let socket = this.connections.get(connectionId)
    if (socket) this.finish(socket)
  }

  sendFrame(socket, kind, data) {
    if (!this.connections.has(socket.connectionId)) return
    this.postMessage({ type: this.types.frame, connectionId: socket.connectionId, kind: kind, data: data })
  }

  closeSocket(socket, isGraceful) {
    if (!this.connections.has(socket.connectionId)) return
    this.postMessage({ type: this.types.close, connectionId: socket.connectionId, isGraceful: isGraceful })
    this.finish(socket)
  }

  finish(socket) {
    this.connections.delete(socket.connectionId)
    if (!this.sockets.delete(socket)) return
    this.handlers.close(socket)
  }

  // hosting ended: drop connections still saying hello; connected guests are
  // ended with the other guest sockets (StandaloneSocketServer)
  closePending() {
    Array.from(this.pending.keys()).forEach((connectionId) => this.reject(connectionId, 'The world is no longer being hosted.'))
  }
}

RelaySocketBridge.RelayGuestSocket = RelayGuestSocket

module.exports = RelaySocketBridge
