const path = require("path")
const { BrowserWindow } = require("electron")
const SteamFraming = require("junon-common/steam_framing")
const RtcTransport = require("junon-common/rtc_transport")
const { SteamFrameAssembler } = SteamFraming

const PEER_ID_PATTERN = /^[0-9a-f]{16}$/

// how long quitting waits for guests to get their last frames
const SHUTDOWN_GRACE_MS = 3 * 1000

// The host's side of WebRTC co-op ("Host online"). Electron's main process
// has no WebRTC, so a hidden window (rtc_host/) keeps the signalling server's
// room and the guests' peer connections, and moves raw data channel messages.
// Main does the rest, as steam_host.js does for Steam: it reassembles frames
// and relays them to the game server (server/util/rtc_socket_bridge.js), and
// splits the server's frames into data channel messages.
//
// The server says when hosting starts and stops (`rtcHosting`); main tells it
// the room code (`rtcRoom`), or that the room couldn't be opened
// (`rtcHostingFailed`).
class RtcHost {
  // signalUrl: the signalling server; postToServer(message); getRoomDetails()
  constructor(signalUrl, postToServer, getRoomDetails) {
    this.signalUrl = signalUrl
    this.postToServer = postToServer
    this.getRoomDetails = getRoomDetails
    this.window = null
    this.isWindowLoaded = false
    this.pendingCommands = []
    // peerId -> { connectionId, assembler }
    this.connections = new Map()
    this.nextConnectionId = 1
    // resolves to the first room code of the current hosting
    this.opening = null
    this.resolveOpening = null
    this.rejectOpening = null
    this.onStopped = null
    this.isPublic = false
    this.visibilityRequests = new Map()
    this.nextVisibilityRequestId = 1
    this.isHosting = false
    this.detailsTimer = null
    this.detailsGeneration = 0
    this.lastDetailsJson = null
  }

  isHostWindow(webContents) {
    return !!this.window && !this.window.isDestroyed() && webContents === this.window.webContents
  }

  ensureWindow() {
    if (this.window && !this.window.isDestroyed()) return

    this.isWindowLoaded = false
    this.window = new BrowserWindow({
      show: false,
      webPreferences: {
        preload: path.join(__dirname, "rtc_host", "rtc_host_preload.js"),
        contextIsolation: true,
        nodeIntegration: false,
        sandbox: true,
        // a hidden window's timers are throttled otherwise
        backgroundThrottling: false
      }
    })
    this.window.webContents.setWindowOpenHandler(() => ({ action: "deny" }))
    this.window.webContents.on("will-navigate", (event) => event.preventDefault())
    this.window.webContents.once("did-finish-load", () => {
      this.isWindowLoaded = true
      this.pendingCommands.forEach((command) => this.window.webContents.send("junon:rtc-host-command", command))
      this.pendingCommands = []
    })
    this.window.webContents.once("render-process-gone", () => this.onWindowGone())
    this.window.loadFile(path.join(__dirname, "rtc_host", "index.html"))
  }

  command(command) {
    if (!this.window || this.window.isDestroyed()) return
    if (!this.isWindowLoaded) return this.pendingCommands.push(command)
    this.window.webContents.send("junon:rtc-host-command", command)
  }

  // rtcHosting from the server (Server#startOnlineHosting, #stopHosting)
  setHosting(message) {
    if (message.isHosting) {
      this.stopDetailsUpdates()
      this.isHosting = true
      this.isPublic = false
      this.opening = new Promise((resolve, reject) => {
        this.resolveOpening = resolve
        this.rejectOpening = reject
      })
      // hostWorldOnline reports a failure
      this.opening.catch(() => {})

      this.ensureWindow()
      this.command({
        type: "start",
        signalUrl: this.signalUrl,
        signalVersion: RtcTransport.SIGNAL_PROTOCOL_VERSION,
        channelLabel: RtcTransport.RTC_CHANNEL_LABEL,
        protocol: message.protocolHash,
        worldName: message.worldName,
        isPublic: false
      })
      this.detailsTimer = setInterval(() => this.refreshDetails(), 5000)
      this.refreshDetails()
      console.log("WebRTC: opening a co-op room")
    } else {
      this.stopDetailsUpdates()
      this.isHosting = false
      this.isPublic = false
      this.visibilityRequests.forEach((entry) => { clearTimeout(entry.timer); entry.reject(new Error('Online hosting ended')) })
      this.visibilityRequests.clear()
      this.finishOpening(null)
      // the server has ended its guest sockets; whatever is left is dropped
      this.connections.clear()
      this.command({ type: "stop" })
      console.log("WebRTC: stopped accepting co-op connections")
    }
  }

  stopDetailsUpdates() {
    clearInterval(this.detailsTimer)
    this.detailsTimer = null
    this.detailsGeneration += 1
    this.lastDetailsJson = null
  }

  async refreshDetails() {
    if (!this.isHosting || !this.getRoomDetails) return
    const generation = this.detailsGeneration
    try {
      const details = await this.getRoomDetails()
      if (!this.isHosting || generation !== this.detailsGeneration) return
      const json = JSON.stringify(details)
      if (json === this.lastDetailsJson) return
      this.lastDetailsJson = json
      this.command({ type: 'details', details: details })
    } catch (error) {
      // A world or its preview can still be loading; the next poll retries.
    }
  }

  setVisibility(isPublic) {
    if (typeof isPublic !== 'boolean') return Promise.reject(new Error('Choose Public or Private'))
    if (!this.isHosting || !this.window || this.window.isDestroyed()) return Promise.reject(new Error('Host online first'))
    const requestId = this.nextVisibilityRequestId++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.visibilityRequests.delete(requestId)
        reject(new Error('The online co-op service did not confirm the change'))
      }, 10000)
      this.visibilityRequests.set(requestId, { resolve, reject, timer })
      this.command({ type: 'visibility', isPublic, requestId })
    })
  }

  finishOpening(code, error) {
    if (!this.resolveOpening) return
    if (error) this.rejectOpening(error)
    else this.resolveOpening(code)
    this.resolveOpening = null
    this.rejectOpening = null
  }

  // events from the hidden window
  onWindowEvent(event) {
    if (!event || typeof event.type !== "string") return

    if (event.type === "room") {
      let code = RtcTransport.normalizeRoomCode(event.code)
      if (!code) return
      this.postToServer({ type: "rtcRoom", code: code })
      this.finishOpening(code)
    } else if (event.type === 'visibility') {
      const pending = this.visibilityRequests.get(event.requestId)
      if (!pending || typeof event.isPublic !== 'boolean') return
      clearTimeout(pending.timer)
      this.visibilityRequests.delete(event.requestId)
      this.isPublic = event.isPublic
      pending.resolve({ isPublic: this.isPublic })
    } else if (event.type === 'visibilityError') {
      const pending = this.visibilityRequests.get(event.requestId)
      if (!pending) return
      clearTimeout(pending.timer)
      this.visibilityRequests.delete(event.requestId)
      pending.reject(new Error(String(event.message || 'Could not change room visibility')))
    } else if (event.type === "failed") {
      this.postToServer({ type: "rtcHostingFailed" })
      this.finishOpening(null, new Error(String(event.message).slice(0, 200)))
    } else if (event.type === "stopped") {
      if (this.onStopped) this.onStopped()
    } else if (typeof event.peerId === "string" && PEER_ID_PATTERN.test(event.peerId)) {
      this.onPeerEvent(event)
    }
  }

  onPeerEvent(event) {
    let entry = this.connections.get(event.peerId)

    if (event.type === "open" && !entry) {
      entry = { connectionId: this.nextConnectionId++, assembler: new SteamFrameAssembler() }
      this.connections.set(event.peerId, entry)
      this.postToServer({ type: "rtcOpen", connectionId: entry.connectionId, address: typeof event.address === "string" ? event.address : null })
    } else if (event.type === "data" && entry && event.data instanceof Uint8Array) {
      let frame
      try {
        frame = entry.assembler.push(Buffer.from(event.data.buffer, event.data.byteOffset, event.data.byteLength))
      } catch (e) {
        // an untrusted peer sent garbage: drop it, and tell the server
        this.connections.delete(event.peerId)
        this.command({ type: "close", peerId: event.peerId, isGraceful: false })
        this.postToServer({ type: "rtcClose", connectionId: entry.connectionId })
        return
      }
      if (frame) this.postToServer({ type: "rtcFrame", connectionId: entry.connectionId, kind: frame.kind, data: frame.data })
    } else if (event.type === "close" && entry) {
      this.connections.delete(event.peerId)
      this.postToServer({ type: "rtcClose", connectionId: entry.connectionId })
    }
  }

  findPeer(connectionId) {
    for (let [peerId, entry] of this.connections) {
      if (entry.connectionId === connectionId) return peerId
    }
    return null
  }

  // rtcFrame and rtcClose from the game server
  onServerMessage(message) {
    let peerId = this.findPeer(message.connectionId)
    if (peerId === null) return

    if (message.type === "rtcClose") {
      this.connections.delete(peerId)
      this.command({ type: "close", peerId: peerId, isGraceful: !!message.isGraceful })
      return
    }

    let data = message.kind === SteamFraming.KIND_CONTROL ? JSON.stringify(message.data) : message.data
    this.command({ type: "send", peerId: peerId, chunks: SteamFraming.encode(message.kind, data, RtcTransport.RTC_CHUNK_LENGTH) })
  }

  // the window crashed: its guests are gone, and so is the room
  onWindowGone() {
    this.window = null
    this.connections.forEach((entry) => this.postToServer({ type: "rtcClose", connectionId: entry.connectionId }))
    this.connections.clear()
    this.postToServer({ type: "rtcHostingFailed" })
    this.finishOpening(null, new Error("Online hosting stopped unexpectedly"))
  }

  // on quit, after the server has saved: lets guests get their last frames,
  // then closes the window
  shutdown() {
    if (!this.window || this.window.isDestroyed()) return Promise.resolve()

    return new Promise((resolve) => {
      let timeout = setTimeout(done, SHUTDOWN_GRACE_MS)
      let window = this.window
      function done() {
        clearTimeout(timeout)
        if (!window.isDestroyed()) window.destroy()
        resolve()
      }
      this.onStopped = done
      this.command({ type: "stop" })
    })
  }
}

RtcHost.isServerMessage = (message) => !!message && (message.type === "rtcFrame" || message.type === "rtcClose")

module.exports = RtcHost
