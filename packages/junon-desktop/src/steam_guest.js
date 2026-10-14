const SteamFraming = require("junon-common/steam_framing")
const { STATE_CONNECTED, STATE_CLOSED_BY_PEER, STATE_PROBLEM_DETECTED_LOCALLY, END_REASON_APP } = require("./steam")
const { SteamFrameAssembler, SteamOutbox, STEAM_VIRTUAL_PORT, STEAM_TRANSPORT_VERSION } = SteamFraming

const STEAM_ID_PATTERN = /^[0-9]{1,20}$/

const RECEIVE_BATCH = 256

// how long a guest waits for the host's welcome
const CONNECT_TIMEOUT_MS = 30 * 1000

// The guest's side of Steam co-op: the renderer's game socket
// (client/src/util/steam_socket.js, through preload.js) relayed over a Steam
// P2P connection to the host. Once connected, the guest says hello with the
// transport version and protocol hash, and the socket only opens for the
// renderer when the host answers welcome. Events go to the renderer as
// `junon:steam-socket` messages: open, message { kind, data },
// close { reason }.
class SteamGuest {
  constructor(runtime) {
    this.runtime = runtime
    // socket id -> { connection, webContents, protocolHash, isOpen, assembler, outbox, timeout }
    this.sockets = new Map()
    this.nextSocketId = 1

    runtime.addPoller(this)
    runtime.networking.onConnectionStateChange(this.onConnectionStateChange.bind(this))
  }

  isActive() {
    return this.sockets.size > 0
  }

  open(webContents, hostSteamId, protocolHash) {
    if (typeof hostSteamId !== "string" || !STEAM_ID_PATTERN.test(hostSteamId)) throw new Error("Invalid Steam id")
    if (typeof protocolHash !== "string" || !/^[a-f0-9]{8}$/.test(protocolHash)) throw new Error("Invalid protocol")

    let networking = this.runtime.networking
    let connection = networking.connectP2P(hostSteamId, STEAM_VIRTUAL_PORT)
    let socketId = this.nextSocketId++
    let socket = {
      connection: connection,
      webContents: webContents,
      protocolHash: protocolHash,
      isOpen: false,
      assembler: new SteamFrameAssembler(),
      outbox: new SteamOutbox((message) => networking.sendMessage(connection, message).result),
      timeout: setTimeout(() => this.fail(socketId, "Can't reach the host on Steam."), CONNECT_TIMEOUT_MS)
    }
    this.sockets.set(socketId, socket)

    // a renderer that goes away takes its sockets with it
    webContents.once("destroyed", () => this.close(socketId, webContents))
    return socketId
  }

  findSocket(connection) {
    for (let [socketId, socket] of this.sockets) {
      if (socket.connection === connection) return socketId
    }
    return null
  }

  onConnectionStateChange(change) {
    let socketId = this.findSocket(change.connection)
    if (socketId === null) return
    let socket = this.sockets.get(socketId)

    if (change.newState === STATE_CONNECTED) {
      this.enqueue(socketId, socket, SteamFraming.KIND_CONTROL, JSON.stringify({ type: "hello", version: STEAM_TRANSPORT_VERSION, protocol: socket.protocolHash }))
    } else if (change.newState === STATE_CLOSED_BY_PEER || change.newState === STATE_PROBLEM_DETECTED_LOCALLY) {
      // the host's last frames (a kick, or the reason it refused) can still
      // be queued when the close is reported
      this.receive(socketId, socket)
      if (!this.sockets.has(socketId)) return
      this.fail(socketId, socket.rejectReason || (socket.isOpen ? "Disconnected from the host." : "Can't reach the host on Steam."))
    }
  }

  poll() {
    this.sockets.forEach((socket, socketId) => {
      this.receive(socketId, socket)
      if (this.sockets.has(socketId) && socket.outbox.flush() === "failed") this.fail(socketId, "Disconnected from the host.")
    })
  }

  receive(socketId, socket) {
    let messages
    do {
      messages = this.runtime.networking.receiveMessages(socket.connection, RECEIVE_BATCH)
      for (let i = 0; i < messages.length; i++) {
        let frame
        try {
          frame = socket.assembler.push(messages[i].data)
        } catch (e) {
          this.fail(socketId, "The host sent a malformed message.")
          return
        }
        if (frame) this.onFrame(socketId, socket, frame)
        if (!this.sockets.has(socketId)) return
      }
    } while (messages.length === RECEIVE_BATCH)
  }

  onFrame(socketId, socket, frame) {
    if (frame.kind !== SteamFraming.KIND_CONTROL) {
      if (socket.isOpen) this.emit(socket, socketId, { type: "message", kind: frame.kind, data: frame.data })
      return
    }

    if (frame.data.type === "welcome" && !socket.isOpen) {
      clearTimeout(socket.timeout)
      socket.isOpen = true
      this.emit(socket, socketId, { type: "open" })
    } else if (frame.data.type === "reject") {
      // the host closes right after; report its reason then
      socket.rejectReason = String(frame.data.reason || "The host refused the connection.").slice(0, 200)
    }
  }

  // kind and data from the renderer: text as a string, binary as bytes
  send(socketId, webContents, kind, data) {
    let socket = this.sockets.get(socketId)
    if (!socket || socket.webContents !== webContents || !socket.isOpen) return
    if (kind !== SteamFraming.KIND_TEXT && kind !== SteamFraming.KIND_BINARY) return
    if (kind === SteamFraming.KIND_TEXT ? typeof data !== "string" : !(data instanceof Uint8Array || data instanceof ArrayBuffer)) return

    try {
      this.enqueue(socketId, socket, kind, data)
    } catch (e) {
      this.fail(socketId, "Couldn't send to the host.")
    }
  }

  enqueue(socketId, socket, kind, data) {
    if (!socket.outbox.enqueue(SteamFraming.encode(kind, data)) || socket.outbox.flush() === "failed") {
      this.fail(socketId, "Disconnected from the host.")
    }
  }

  close(socketId, webContents) {
    let socket = this.sockets.get(socketId)
    if (!socket || socket.webContents !== webContents) return

    socket.outbox.flush()
    this.remove(socketId, socket, true)
  }

  fail(socketId, reason) {
    let socket = this.sockets.get(socketId)
    if (!socket) return

    this.remove(socketId, socket, false)
    this.emit(socket, socketId, { type: "close", wasOpen: socket.isOpen, reason: reason })
  }

  remove(socketId, socket, isGraceful) {
    clearTimeout(socket.timeout)
    this.sockets.delete(socketId)
    this.runtime.networking.closeConnection(socket.connection, END_REASON_APP, "", isGraceful)
  }

  emit(socket, socketId, event) {
    if (socket.webContents.isDestroyed()) return
    socket.webContents.send("junon:steam-socket", socketId, event)
  }
}

module.exports = SteamGuest
