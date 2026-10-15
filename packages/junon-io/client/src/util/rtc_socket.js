const SteamFraming = require('junon-common/steam_framing')
const RtcTransport = require('junon-common/rtc_transport')
const OnlineCoop = require('./online_coop')

const CONNECTING = 0
const OPEN = 1
const CLOSED = 3

// how long a guest waits for the host's welcome
const CONNECT_TIMEOUT_MS = 30 * 1000
// Chromium closes a data channel whose send buffer overflows, so sends wait
// here while it holds more than HIGH_WATER
const HIGH_WATER_BYTES = 1024 * 1024
const LOW_WATER_BYTES = 256 * 1024
const MAX_QUEUED_BYTES = 64 * 1024 * 1024

const CANT_CONNECT = 'Couldn\'t connect to the host. A firewall or a strict router on either side can block direct connections; if this keeps happening, join by address or over a VPN.'

// An online (WebRTC) co-op guest's game socket. It has the part of the
// WebSocket API that GameConnection and SocketUtil use (onopen, onmessage,
// onerror, onclose, send, close, readyState, binaryType "arraybuffer"). The
// URL is rtc:<room code>.
//
// It asks the signalling server (packages/junon-signal) for the room, offers
// the host a data channel, and trades ICE candidates through the server
// until the channel opens. Then it says hello with the transport version and
// protocol hash, in the Steam co-op framing, and opens for the game when the
// host answers welcome (packages/junon-desktop/src/rtc_host.js,
// server/util/rtc_socket_bridge.js).
class RtcSocket {
  static isRtcUrl(url) {
    return /^rtc:[2-9A-HJKMNP-TV-Z]{8}$/.test(url || '')
  }

  static urlFor(code) {
    return 'rtc:' + code
  }

  constructor(url) {
    this.url = url
    this.code = url.replace(/^rtc:/, '')
    this.readyState = CONNECTING
    this.binaryType = 'arraybuffer'
    this.assembler = new SteamFraming.SteamFrameAssembler()
    this.queue = []
    this.queuedBytes = 0
    this.timeout = setTimeout(() => this.fail(CANT_CONNECT), CONNECT_TIMEOUT_MS)

    OnlineCoop.getStatus().then((status) => {
      if (this.readyState === CLOSED) return
      if (!status.isAvailable) return this.fail('Online co-op is not available')
      this.connectSignal(status.signalUrl)
    })
  }

  connectSignal(signalUrl) {
    const ws = new WebSocket(RtcTransport.signalUrl(signalUrl, 'join', this.code))
    this.signal = ws

    ws.onopen = () => ws.send(JSON.stringify({ type: 'join', version: RtcTransport.SIGNAL_PROTOCOL_VERSION, code: this.code }))
    ws.onmessage = (event) => {
      let message
      try { message = JSON.parse(event.data) } catch (e) { return }
      this.onSignal(message)
    }
    // once paired, the host takes it from here (and has the server close
    // this when the channel opens)
    ws.onclose = () => {
      if (this.pc) return
      this.fail(this.signalError || OnlineCoop.unreachableMessage())
    }
  }

  sendSignal(data) {
    if (this.signal && this.signal.readyState === WebSocket.OPEN) this.signal.send(JSON.stringify({ type: 'signal', data: data }))
  }

  onSignal(message) {
    if (message.type === 'error') {
      this.signalError = String(message.message || CANT_CONNECT).slice(0, 200)
    } else if (message.type === 'joined' && !this.pc) {
      if (message.protocol !== window.protocolHash) return this.fail(OnlineCoop.versionMismatchMessage())
      this.connectPeer(Array.isArray(message.iceServers) ? message.iceServers : [])
    } else if (message.type === 'signal' && this.pc && message.data) {
      this.onPeerSignal(message.data)
    }
  }

  async connectPeer(iceServers) {
    const pc = new RTCPeerConnection({ iceServers: iceServers })
    this.pc = pc

    const channel = pc.createDataChannel(RtcTransport.RTC_CHANNEL_LABEL, { ordered: true })
    this.channel = channel
    channel.binaryType = 'arraybuffer'
    channel.bufferedAmountLowThreshold = LOW_WATER_BYTES
    channel.onbufferedamountlow = () => this.flush()
    channel.onopen = () => {
      this.isChannelOpen = true
      this.sendFrame(SteamFraming.KIND_CONTROL, JSON.stringify({ type: 'hello', version: RtcTransport.RTC_TRANSPORT_VERSION, protocol: window.protocolHash }))
    }
    channel.onmessage = (event) => this.onChannelMessage(event.data)
    channel.onclose = () => this.fail(this.rejectReason || (this.readyState === OPEN ? 'Disconnected from the host.' : CANT_CONNECT))

    pc.onicecandidate = (event) => {
      if (event.candidate) this.sendSignal({ candidate: event.candidate.toJSON() })
    }
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') this.fail(this.readyState === OPEN ? 'Disconnected from the host.' : CANT_CONNECT)
    }

    try {
      await pc.setLocalDescription(await pc.createOffer())
      this.sendSignal({ sdp: pc.localDescription.toJSON() })
    } catch (e) {
      this.fail(CANT_CONNECT)
    }
  }

  async onPeerSignal(data) {
    try {
      if (data.sdp && data.sdp.type === 'answer' && !this.pc.remoteDescription) {
        await this.pc.setRemoteDescription(data.sdp)
      } else if (data.candidate) {
        await this.pc.addIceCandidate(data.candidate)
      }
    } catch (e) {
      this.fail(CANT_CONNECT)
    }
  }

  onChannelMessage(data) {
    if (this.readyState === CLOSED) return
    if (!(data instanceof ArrayBuffer)) return this.fail('The host sent a malformed message.')

    let frame
    try {
      frame = this.assembler.push(Buffer.from(data))
    } catch (e) {
      return this.fail('The host sent a malformed message.')
    }
    if (!frame) return

    if (frame.kind === SteamFraming.KIND_CONTROL) return this.onControl(frame.data)
    if (this.readyState !== OPEN || !this.onmessage) return

    if (frame.kind === SteamFraming.KIND_BINARY) {
      // SocketUtil expects an ArrayBuffer
      const bytes = frame.data
      this.onmessage({ data: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) })
    } else {
      this.onmessage({ data: frame.data })
    }
  }

  onControl(control) {
    if (control.type === 'welcome' && this.readyState === CONNECTING) {
      clearTimeout(this.timeout)
      this.readyState = OPEN
      if (this.signal) this.signal.close()
      if (this.onopen) this.onopen({})
    } else if (control.type === 'reject') {
      // the host closes right after; report its reason then
      this.rejectReason = String(control.reason || 'The host refused the connection.').slice(0, 200)
    }
  }

  sendFrame(kind, data) {
    SteamFraming.encode(kind, data, RtcTransport.RTC_CHUNK_LENGTH).forEach((chunk) => {
      this.queue.push(chunk)
      this.queuedBytes += chunk.length
    })
    if (this.queuedBytes > MAX_QUEUED_BYTES) return this.fail('Disconnected from the host.')
    this.flush()
  }

  flush() {
    const channel = this.channel
    if (!channel || channel.readyState !== 'open') return

    try {
      while (this.queue.length > 0 && channel.bufferedAmount < HIGH_WATER_BYTES) {
        const chunk = this.queue.shift()
        this.queuedBytes -= chunk.length
        channel.send(chunk)
      }
    } catch (e) {
      this.fail('Disconnected from the host.')
    }
  }

  send(data) {
    if (this.readyState !== OPEN) return

    if (typeof data === 'string') {
      this.sendFrame(SteamFraming.KIND_TEXT, data)
    } else {
      this.sendFrame(SteamFraming.KIND_BINARY, data instanceof ArrayBuffer ? new Uint8Array(data) : data)
    }
  }

  // like a WebSocket that failed to open: error, then close; reason says why
  fail(reason) {
    if (this.readyState === CLOSED) return
    const wasOpen = this.readyState === OPEN
    this.teardown()
    this.closeReason = reason

    if (!wasOpen && this.onerror) this.onerror({ reason: reason })
    if (this.onclose) this.onclose({ reason: reason })
  }

  close() {
    if (this.readyState === CLOSED) return
    const wasOpen = this.readyState === OPEN
    this.teardown()

    if (!wasOpen && this.onerror) this.onerror({ reason: null })
    if (this.onclose) this.onclose({ reason: null })
  }

  teardown() {
    this.readyState = CLOSED
    clearTimeout(this.timeout)
    this.queue = []
    this.queuedBytes = 0
    if (this.channel) this.channel.onclose = null
    if (this.pc) this.pc.close()
    if (this.signal) this.signal.close()
  }
}

module.exports = RtcSocket
