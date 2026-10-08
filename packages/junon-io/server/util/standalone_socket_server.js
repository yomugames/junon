const http = require("http")
const WebSocket = require("ws")

// Game socket for NODE_ENV=standalone. Hosted servers use uWebSockets.js, which
// ships prebuilt binaries for Node's ABI only and doesn't load inside Electron,
// so the desktop runtime uses the pure-JS `ws` package instead. Sockets are
// wrapped to expose the subset of the uWS WebSocket API that SocketUtil, Game
// and Player use: send(data, isBinary), close(), end(), and remoteAddress.
//
// The main listener is the host's own (loopback by default). Co-op hosting
// adds a guest listener on another address and port; its sockets are marked
// `isGuest`, and its upgrades must pass the `authorizeGuest` handler.

const MAX_PAYLOAD_LENGTH = 16 * 1024 * 1024

// matches the uWS idleTimeout: clients send a Ping every 3 seconds in game
const IDLE_TIMEOUT_MS = 120 * 1000

class StandaloneSocket {
  constructor(ws, remoteAddress, isGuest) {
    this.ws = ws
    this.remoteAddress = remoteAddress
    this.isGuest = isGuest
    this.lastMessageTime = Date.now()
  }

  send(data, isBinary) {
    if (this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(data, { binary: !!isBinary })
  }

  close() {
    this.ws.terminate()
  }

  // graceful close: messages sent before it are delivered first
  end() {
    this.ws.close()
  }
}

class StandaloneSocketServer {
  // handlers: { open(socket), message(socket, data, isBinary), close(socket),
  // http(req, res, isGuest) returning false for unknown routes,
  // authorizeGuest(req) returning true to accept a guest connection }
  constructor(handlers) {
    this.handlers = handlers
    this.sockets = new Set()

    this.httpServer = this.createHttpServer(false)
    this.wss = new WebSocket.Server({ noServer: true, maxPayload: MAX_PAYLOAD_LENGTH })

    this.idleInterval = setInterval(this.closeIdleSockets.bind(this), 10 * 1000)
  }

  static normalizeAddress(address) {
    // IPv4 clients of a dual-stack socket appear as ::ffff:a.b.c.d; uWS
    // reported the plain IPv4 form, which bans and spot reservations store
    return (address || "").replace(/^::ffff:/, "")
  }

  createHttpServer(isGuest) {
    let server = http.createServer((req, res) => {
      if (!this.handlers.http(req, res, isGuest)) {
        res.writeHead(404)
        res.end()
      }
    })

    server.on("upgrade", (req, netSocket, head) => {
      if (isGuest && !this.handlers.authorizeGuest(req)) {
        netSocket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n")
        return
      }

      this.wss.handleUpgrade(req, netSocket, head, (ws) => this.onConnection(ws, req, isGuest))
    })

    return server
  }

  onConnection(ws, req, isGuest) {
    let socket = new StandaloneSocket(ws, StandaloneSocketServer.normalizeAddress(req.socket.remoteAddress), isGuest)
    this.sockets.add(socket)

    // ws 7 delivers text frames as strings and binary frames as Buffers
    ws.on("message", (data) => {
      socket.lastMessageTime = Date.now()
      this.handlers.message(socket, data, typeof data !== "string")
    })

    ws.on("close", () => {
      if (!this.sockets.delete(socket)) return
      this.handlers.close(socket)
    })

    ws.on("error", () => {
      ws.terminate()
    })

    this.handlers.open(socket)
  }

  closeIdleSockets() {
    let now = Date.now()
    this.sockets.forEach((socket) => {
      if (now - socket.lastMessageTime > IDLE_TIMEOUT_MS) socket.close()
    })
  }

  listen(host, port) {
    return StandaloneSocketServer.listenOn(this.httpServer, host, port)
  }

  static listenOn(server, host, port) {
    return new Promise((resolve, reject) => {
      let onError = (e) => reject(e)
      server.once("error", onError)
      server.listen(port, host, () => {
        server.removeListener("error", onError)
        resolve()
      })
    })
  }

  isGuestListenerOpen() {
    return !!this.guestServer
  }

  async openGuestListener(host, port) {
    if (this.guestServer) throw new Error("Already hosting")

    let server = this.createHttpServer(true)
    await StandaloneSocketServer.listenOn(server, host, port)
    this.guestServer = server
  }

  // stops accepting guests and disconnects the connected ones; callers send
  // them a reason first, which end() still delivers
  closeGuestListener() {
    if (!this.guestServer) return

    this.guestServer.close()
    this.guestServer = null

    this.sockets.forEach((socket) => {
      if (socket.isGuest) socket.end()
    })
  }
}

module.exports = StandaloneSocketServer
