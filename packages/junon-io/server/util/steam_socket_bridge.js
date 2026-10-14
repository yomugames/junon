const SteamFraming = require('junon-common/steam_framing')

// Steam co-op guests on the game server. The desktop shell's main process
// owns the Steam connections (packages/junon-desktop/src/steam_host.js) and
// relays whole frames over the desktop channel:
//
//   from main: steamOpen { connectionId, steamId }
//              steamFrame { connectionId, kind, data }
//              steamClose { connectionId }
//   to main:   steamFrame { connectionId, kind, data }
//              steamClose { connectionId, isGraceful }
//
// Each accepted connection becomes a SteamGuestSocket, with the
// StandaloneSocket shape that SocketUtil, Game and Player use, and joins the
// socket server's set, so idle closing and the hosting kick loop apply. The
// guest's first frame must be a control hello with the transport version and
// protocol hash; nothing reaches the game before it.
//
// steamId comes from main, which reads it from the authenticated Steam
// connection; the guest can't choose it.

const HELLO_TIMEOUT_MS = 15 * 1000
const STEAM_ID_PATTERN = /^[0-9]{1,20}$/

class SteamGuestSocket {
  constructor(bridge, connectionId, steamId) {
    this.bridge = bridge
    this.connectionId = connectionId
    this.steamId = steamId
    this.remoteAddress = 'steam:' + steamId
    this.isGuest = true
    this.isSteam = true
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

class SteamSocketBridge {
  // options: { postMessage(message), sockets (the socket server's Set),
  // handlers: { open(socket), message(socket, data, isBinary), close(socket) },
  // protocolHash, isAccepting() }
  constructor(options) {
    this.postMessage = options.postMessage
    this.sockets = options.sockets
    this.handlers = options.handlers
    this.protocolHash = options.protocolHash
    this.isAccepting = options.isAccepting

    this.pending = new Map()
    this.connections = new Map()
  }

  static isBridgeMessage(message) {
    return !!message && ['steamOpen', 'steamFrame', 'steamClose'].includes(message.type)
  }

  // returns false for messages that aren't the bridge's
  handle(message) {
    if (!SteamSocketBridge.isBridgeMessage(message)) return false
    if (!Number.isInteger(message.connectionId)) return true

    if (message.type === 'steamOpen') this.onOpen(message.connectionId, message.steamId)
    if (message.type === 'steamFrame') this.onFrame(message.connectionId, message.kind, message.data)
    if (message.type === 'steamClose') this.onClose(message.connectionId)
    return true
  }

  onOpen(connectionId, steamId) {
    if (this.pending.has(connectionId) || this.connections.has(connectionId)) return
    if (!this.isAccepting() || typeof steamId !== 'string' || !STEAM_ID_PATTERN.test(steamId)) {
      this.postMessage({ type: 'steamClose', connectionId: connectionId, isGraceful: false })
      return
    }

    let timeout = setTimeout(() => this.reject(connectionId, 'No hello from the guest.'), HELLO_TIMEOUT_MS)
    this.pending.set(connectionId, { steamId: steamId, timeout: timeout })
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

    if (data.version !== SteamFraming.STEAM_TRANSPORT_VERSION || data.protocol !== this.protocolHash) {
      return this.reject(connectionId, 'Version mismatch: the host runs a different version of Junon. Both players need the same version.', 'version')
    }

    clearTimeout(pending.timeout)
    this.pending.delete(connectionId)
    if (!this.isAccepting()) return this.reject(connectionId, 'The world is no longer being hosted.')

    let socket = new SteamGuestSocket(this, connectionId, pending.steamId)
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
    this.postMessage({ type: 'steamFrame', connectionId: connectionId, kind: SteamFraming.KIND_CONTROL, data: { type: 'reject', reason: reason, code: code || 'refused' } })
    this.postMessage({ type: 'steamClose', connectionId: connectionId, isGraceful: true })
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
    this.postMessage({ type: 'steamFrame', connectionId: socket.connectionId, kind: kind, data: data })
  }

  closeSocket(socket, isGraceful) {
    if (!this.connections.has(socket.connectionId)) return
    this.postMessage({ type: 'steamClose', connectionId: socket.connectionId, isGraceful: isGraceful })
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

SteamSocketBridge.SteamGuestSocket = SteamGuestSocket

module.exports = SteamSocketBridge
