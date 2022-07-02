const protobuf = require("protobufjs")
const base64id = require('base64id')

const LOG = require('./logger')
const ExceptionReporter = require("./exception_reporter")

class SocketUtil {

  constructor(options = {}) {
    this.sockets = {}
    this.handlers = {}

    this.protocol = options.protocol
    this.isTextMode = options.isTextMode 
  }

  broadcast(socketIds, eventName, payload, options) {
    options = options || {}

    socketIds = socketIds || Object.keys(this.sockets)
    
    for (let i = 0; i < socketIds.length; i++) {
      let socketId = socketIds[i]
      let socket = this.sockets[socketId]

      if (socket && socket.id !== options.excludeSocketId) {
        this.emit(socket, eventName, payload)
      }
    }
  }

  emit(socket, eventName, payload) {
    if (this.isTextMode) {
      this.emitText(socket, eventName, payload)
    } else {
      this.emitBinary(socket, eventName, payload)
    }
  }

  emitText(socket, eventName, payload) {
    if (socket.isClosed) return

    let data = { event: eventName, data: payload }

    let isBinary = false
    socket.send(JSON.stringify(data), isBinary)
  }

  removeSocketById(socketId) {
    delete this.sockets[socketId]
  }

  markSocketAsClosed(socket) {
    socket.isClosed = true
  }

  emitBinary(socket, eventName, payload) {
    if (typeof socket === "undefined") return
    if (socket.isClosed) return

    const errMsg = this.protocol[eventName].verify(payload)
    if (errMsg)  { 
      ExceptionReporter.captureException(new Error(errMsg))
      return
    }

    const wrappedMessage = {}
    wrappedMessage[eventName] = payload

    const buffer  = this.protocol.MessageWrapper.encode(wrappedMessage).finish()

    if (debugMode) {
      const isEncodingFailed = buffer.length === 0
      if (isEncodingFailed) {
        let msg = "Failed to binary encode " + eventName + " : " + JSON.stringify(payload) + " . Make sure event is included in MessageWrapper#oneof list"
        ExceptionReporter.captureException(new Error(msg))
        return
      }
    }

    // LOG.debug("emit: " + eventName)

    let isBinary = true
    socket.send(buffer, isBinary)
  }

  on(eventName, handler) {
    // register handler if never registered before
    this.handlers[eventName] = this.handlers[eventName] || handler
  }

  registerSocket(socket) {
    if (this.sockets[socket.id]) return; // already initialized

    socket.id = base64id.generateId()

    this.sockets[socket.id] = socket
  }

  getSocket(socketId) {
    return this.sockets[socketId]
  }

  unregisterSocket(socket) {
    delete this.sockets[socket.id]
  }

  onClientDisconnect(socket, handler) {
    socket.on("close", () => {
      try {
        handler(socket)
      } catch(e) {
        ExceptionReporter.captureException(e)
        LOG.error(e)
      }
    })
  }

  onTextMessage(socket, message) {
    try {
      let data = JSON.parse(message)
      this.handlers[data.event](data, socket)
    } catch(e) {
      ExceptionReporter.captureException(e)
    }
  }

  // https://github.com/uNetworking/bindings/blob/master/nodejs/examples/echo.js
  onMessage(socket, arrayBuffer) {
    try {
      const uint8Array = new Uint8Array(arrayBuffer)

      const messageWrapper = this.protocol.MessageWrapper.decode(uint8Array)
      const data = messageWrapper[messageWrapper.kind]

      const isMessageHandlerDefined = typeof this.handlers[messageWrapper.kind] === "function"

      if (!isMessageHandlerDefined) throw "Must implement Socket handler for " + messageWrapper.kind + " on server."
      this.handlers[messageWrapper.kind](data, socket)
    } catch(e) {
      // handle errors gracefully (dont disconnect clients)
      ExceptionReporter.captureException(e)
    }
  }


}

module.exports = SocketUtil
