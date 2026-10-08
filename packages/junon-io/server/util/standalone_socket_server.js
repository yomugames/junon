const http = require("http")
const WebSocket = require("ws")

// Game socket for NODE_ENV=standalone. Hosted servers use uWebSockets.js, which
// ships prebuilt binaries for Node's ABI only and doesn't load inside Electron,
// so the desktop runtime uses the pure-JS `ws` package instead. Sockets are
// wrapped to expose the subset of the uWS WebSocket API that SocketUtil, Game
// and Player use: send(data, isBinary), close(), and remoteAddress.

const MAX_PAYLOAD_LENGTH = 16 * 1024 * 1024

// matches the uWS idleTimeout: clients send a Ping every 3 seconds in game
const IDLE_TIMEOUT_MS = 120 * 1000

class StandaloneSocket {
  constructor(ws, remoteAddress) {
    this.ws = ws
    this.remoteAddress = remoteAddress
    this.lastMessageTime = Date.now()
  }

  send(data, isBinary) {
    if (this.ws.readyState !== WebSocket.OPEN) return
    this.ws.send(data, { binary: !!isBinary })
  }

  close() {
    this.ws.terminate()
  }
}

class StandaloneSocketServer {
  // handlers: { open(socket), message(socket, data, isBinary), close(socket),
  // http(req, res) returning false for unknown routes }
  constructor(handlers) {
    this.handlers = handlers
    this.sockets = new Set()

    this.httpServer = http.createServer((req, res) => {
      if (!this.handlers.http(req, res)) {
        res.writeHead(404)
        res.end()
      }
    })

    this.wss = new WebSocket.Server({ server: this.httpServer, maxPayload: MAX_PAYLOAD_LENGTH })
    this.wss.on("connection", this.onConnection.bind(this))

    this.idleInterval = setInterval(this.closeIdleSockets.bind(this), 10 * 1000)
  }

  static normalizeAddress(address) {
    // IPv4 clients of a dual-stack socket appear as ::ffff:a.b.c.d; uWS
    // reported the plain IPv4 form, which bans and spot reservations store
    return (address || "").replace(/^::ffff:/, "")
  }

  onConnection(ws, req) {
    let socket = new StandaloneSocket(ws, StandaloneSocketServer.normalizeAddress(req.socket.remoteAddress))
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
    return new Promise((resolve, reject) => {
      let onError = (e) => reject(e)
      this.httpServer.once("error", onError)
      this.httpServer.listen(port, host, () => {
        this.httpServer.removeListener("error", onError)
        resolve()
      })
    })
  }
}

module.exports = StandaloneSocketServer
