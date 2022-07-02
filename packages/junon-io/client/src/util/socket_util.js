class SocketUtil {

  static getInstance() {
    if (!this.instance) {
      this.instance = new SocketUtil()
    }  

    return this.instance
  }

  static init(options) {
    this.getInstance().init(options)  
  }

  static setSocket(socket) {
    this.getInstance().setSocket(socket)  
  }

  static emit(eventName, payload) {
    this.getInstance().emit(eventName, payload)  
  }

  static on(eventName, handler) {
    this.getInstance().on(eventName, handler)  
  }

  static onMessage(e) {
    this.getInstance().onMessage(e)
  }

  static listenToMessages() {
    this.getInstance().listenToMessages(e)
  }

  init(options = {}){
    this.protocol = options.protocol
    this.options = options

    this.handlers = {}

    this.isOnMessageRegistered = false
  }

  setSocket(socket) {
    this.socket = socket
    this.isOnMessageRegistered = false
    this.listenToMessages()
  }

  emit(eventName, payload) {
    if (!this.socket) return
    if (this.socket.readyState !== WebSocket.OPEN) {
      return
    }

    const messageProtocol = this.protocol[eventName]
    if (!messageProtocol) {
      throw "The message '" + eventName + "' is not defined in Protocol Buffer file app.proto"
    }
    const message = this.protocol[eventName].create(payload)

    const wrappedMessage = {}
    wrappedMessage[eventName] = message

    const messageWrapper = this.protocol.MessageWrapper.create(wrappedMessage)
    const uint8Array  = this.protocol.MessageWrapper.encode(messageWrapper).finish()

    if (env === "development") {
      const isEncodingFailed = uint8Array.length === 0
      if (isEncodingFailed) {
        throw "Failed to binary encode " + eventName + " : " + JSON.stringify(payload) + " . Make sure event is included in MessageWrapper#oneof list"
      }
    }

    const copy = new Uint8Array(uint8Array.length)
    uint8Array.forEach((value, index) => { copy[index] = value; })

    this.socket.send(copy.buffer)
  }

  on(eventName, handler) {
    this.handlers[eventName] = handler
  }

  onMessage(e) {
    const arrayBuffer = e.data
    const uint8Array = new Uint8Array(arrayBuffer)

    const messageWrapper = this.protocol.MessageWrapper.decode(uint8Array)
    const data = messageWrapper[messageWrapper.kind]

    const isMessageHandlerDefined = typeof this.handlers[messageWrapper.kind] === "function"
    if (!isMessageHandlerDefined) {
      if (this.options.allowMissingHandlers) {
        return
      } else {
        throw new Error("Must implement Socket handler for " + messageWrapper.kind)
      }
    }

    this.handlers[messageWrapper.kind](data)
  }

  listenToMessages() {
    if (this.isOnMessageRegistered) return; // already initialized

    this.socket.onmessage = this.onMessage.bind(this)
    this.isOnMessageRegistered = true
  }

}

module.exports = SocketUtil
