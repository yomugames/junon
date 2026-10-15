const SteamFraming = require("junon-common/steam_framing")
const { STATE_CONNECTED, STATE_CLOSED_BY_PEER, STATE_PROBLEM_DETECTED_LOCALLY, END_REASON_APP } = require("./steam")
const { SteamFrameAssembler, SteamOutbox, STEAM_VIRTUAL_PORT } = SteamFraming

// a guest joins the lobby before it connects, but the host may see the
// connection request before the lobby's member list updates
const MEMBERSHIP_WAIT_MS = 10 * 1000

// The host's side of Steam co-op. While the game server says the world is
// hosted on Steam (`steamHosting`), a P2P listen socket accepts guests'
// connections; their messages are reassembled into frames and relayed to the
// server (server/util/steam_socket_bridge.js), and the server's frames are
// split and sent back. The guest's Steam id comes from the authenticated
// connection, and only members of the host's lobby are accepted
// (steam_lobby.js).
class SteamHost {
  // runtime: SteamRuntime; postToServer(message); isAllowed(steamId)
  constructor(runtime, postToServer, isAllowed) {
    this.runtime = runtime
    this.postToServer = postToServer
    this.isAllowed = isAllowed
    // connection requests waiting for their Steam id to show up in the lobby
    this.pendingRequests = new Map()
    this.listenSocket = null
    this.pollGroup = null
    // Steam connection handle -> { connectionId, steamId, assembler, outbox }
    this.connections = new Map()
    this.nextConnectionId = 1

    runtime.addPoller(this)
    runtime.networking.onConnectionRequest(this.onConnectionRequest.bind(this))
    runtime.networking.onConnectionStateChange(this.onConnectionStateChange.bind(this))
  }

  isActive() {
    return this.connections.size > 0 || this.pendingRequests.size > 0
  }

  setHosting(isHosting) {
    if (isHosting && !this.listenSocket) {
      this.listenSocket = this.runtime.networking.createListenSocketP2P(STEAM_VIRTUAL_PORT)
      this.pollGroup = this.runtime.networking.createPollGroup()
      console.log("Steam: accepting co-op connections")
    } else if (!isHosting && this.listenSocket) {
      // the server has already ended its guest sockets; closing the listen
      // socket drops whatever is left
      Array.from(this.connections.keys()).forEach((connection) => this.closeConnection(connection, true))
      this.pendingRequests.forEach((request, connection) => this.runtime.networking.closeConnection(connection, END_REASON_APP, "", false))
      this.pendingRequests.clear()
      this.runtime.networking.closeListenSocket(this.listenSocket)
      this.runtime.networking.destroyPollGroup(this.pollGroup)
      this.listenSocket = null
      this.pollGroup = null
      console.log("Steam: stopped accepting co-op connections")
    }
  }

  onConnectionRequest(request) {
    if (!this.listenSocket || request.listenSocket !== this.listenSocket) return

    this.pendingRequests.set(request.connection, { steamId: String(request.identityRemote), deadline: Date.now() + MEMBERSHIP_WAIT_MS })
    this.checkPendingRequests()
  }

  checkPendingRequests() {
    let now = Date.now()
    this.pendingRequests.forEach((request, connection) => {
      if (this.isAllowed(request.steamId)) {
        this.pendingRequests.delete(connection)
        this.runtime.networking.acceptConnection(connection)
      } else if (now > request.deadline) {
        this.pendingRequests.delete(connection)
        this.runtime.networking.closeConnection(connection, END_REASON_APP, "Not in the host's lobby", false)
      }
    })
  }

  onConnectionStateChange(change) {
    if (!this.listenSocket || change.info.listenSocket !== this.listenSocket) return

    // a requester that gave up before it was let in
    if (this.pendingRequests.has(change.connection)) {
      if (change.newState === STATE_CLOSED_BY_PEER || change.newState === STATE_PROBLEM_DETECTED_LOCALLY) {
        this.pendingRequests.delete(change.connection)
        this.runtime.networking.closeConnection(change.connection, 0, "", false)
      }
      return
    }

    if (change.newState === STATE_CONNECTED && !this.connections.has(change.connection)) {
      this.onConnected(change.connection, change.info.identityRemote)
    } else if (change.newState === STATE_CLOSED_BY_PEER || change.newState === STATE_PROBLEM_DETECTED_LOCALLY) {
      this.onDisconnected(change.connection)
    }
  }

  onConnected(connection, steamId) {
    let networking = this.runtime.networking
    let entry = {
      connectionId: this.nextConnectionId++,
      steamId: String(steamId),
      assembler: new SteamFrameAssembler(),
      outbox: new SteamOutbox((message) => networking.sendMessage(connection, message).result)
    }

    this.connections.set(connection, entry)
    networking.setConnectionPollGroup(connection, this.pollGroup)
    this.postToServer({ type: "steamOpen", connectionId: entry.connectionId, steamId: entry.steamId })
  }

  onDisconnected(connection) {
    let entry = this.connections.get(connection)
    this.runtime.networking.closeConnection(connection, 0, "", false)
    if (!entry) return

    this.connections.delete(connection)
    this.postToServer({ type: "steamClose", connectionId: entry.connectionId })
  }

  // the host closing a connection, by the server's request or on bad input
  closeConnection(connection, isGraceful) {
    let entry = this.connections.get(connection)
    if (entry && isGraceful) entry.outbox.flush()

    this.runtime.networking.closeConnection(connection, END_REASON_APP, "", isGraceful)
    this.connections.delete(connection)
    return entry
  }

  findConnection(connectionId) {
    for (let [connection, entry] of this.connections) {
      if (entry.connectionId === connectionId) return connection
    }
    return null
  }

  poll() {
    if (!this.pollGroup) return
    this.checkPendingRequests()

    let messages = this.runtime.networking.receiveMessagesOnPollGroup(this.pollGroup, 256)
    messages.forEach((message) => {
      let entry = this.connections.get(message.connection)
      if (!entry) return

      let frame
      try {
        frame = entry.assembler.push(message.data)
      } catch (e) {
        // an untrusted peer sent garbage: drop it, and tell the server
        this.closeConnection(message.connection, false)
        this.postToServer({ type: "steamClose", connectionId: entry.connectionId })
        return
      }

      if (frame) this.postToServer({ type: "steamFrame", connectionId: entry.connectionId, kind: frame.kind, data: frame.data })
    })

    this.connections.forEach((entry, connection) => {
      if (entry.outbox.flush() === "failed") this.onDisconnected(connection)
    })
  }

  // steamFrame and steamClose from the game server
  onServerMessage(message) {
    let connection = this.findConnection(message.connectionId)
    if (connection === null) return

    if (message.type === "steamClose") {
      this.closeConnection(connection, !!message.isGraceful)
      return
    }

    let entry = this.connections.get(connection)
    let data = message.kind === SteamFraming.KIND_CONTROL ? JSON.stringify(message.data) : message.data
    if (!entry.outbox.enqueue(SteamFraming.encode(message.kind, data))) {
      // too far behind to catch up
      this.closeConnection(connection, false)
      this.postToServer({ type: "steamClose", connectionId: entry.connectionId })
      return
    }

    if (entry.outbox.flush() === "failed") this.onDisconnected(connection)
  }
}

SteamHost.isServerMessage = (message) => !!message && (message.type === "steamFrame" || message.type === "steamClose")

module.exports = SteamHost
