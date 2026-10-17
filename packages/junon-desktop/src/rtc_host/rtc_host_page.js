// The host's side of WebRTC co-op, in a hidden window because Electron's main
// process has no WebRTC. It keeps a room open on the signalling server
// (packages/junon-signal), answers each guest's offer, and moves the bytes of
// their data channels to and from main (rtc_host.js), which does the framing
// and talks to the game server. Nothing here parses game traffic.
//
// Commands from main:
//   start { signalUrl, signalVersion, channelLabel, protocol, worldName }
//   visibility { isPublic, requestId }, send { peerId, chunks },
//   close { peerId, isGraceful }, stop
// Events to main:
//   room { code }, failed { message }, open { peerId, address },
//   data { peerId, data }, close { peerId }, stopped, visibility

const SIGNAL_TIMEOUT_MS = 10 * 1000
// The signalling connection stays open while hosting. A ping every
// KEEPALIVE_MS keeps proxies from closing it as idle (the Cloudflare Worker
// answers without waking the room); no pong for KEEPALIVE_DEAD_MS means the
// connection is dead, and it's reopened.
const KEEPALIVE_MS = 30 * 1000
const KEEPALIVE_DEAD_MS = 75 * 1000
const MAX_RECONNECT_DELAY_MS = 30 * 1000
// a guest's data channel must open this soon after it asks to join
const PEER_CONNECT_TIMEOUT_MS = 30 * 1000
// how long a graceful close may take to deliver what's queued
const CLOSE_GRACE_MS = 5 * 1000
// Chromium closes a data channel whose send buffer overflows, so sends wait
// here while it holds more than HIGH_WATER
const HIGH_WATER_BYTES = 1024 * 1024
const LOW_WATER_BYTES = 256 * 1024
// a guest this far behind is dropped
const MAX_QUEUED_BYTES = 64 * 1024 * 1024

let config = null
// { code, token }, once the signalling server gave the room
let room = null
let iceServers = []
let signal = null
let reconnectAttempts = 0
let reconnectTimer = null
// peerId -> { pc, channel, queue, queuedBytes, isOpen, isClosing, inbox, timer }
const peers = new Map()

window.rtcHost.onCommand((command) => {
  if (command.type === "start") start(command)
  if (command.type === "stop") stop()
  if (command.type === "send") send(command.peerId, command.chunks)
  if (command.type === "close") closePeer(command.peerId, command.isGraceful, false)
  if (command.type === 'visibility') setVisibility(command)
  if (command.type === 'details') setDetails(command)
})

function emit(message) {
  window.rtcHost.emit(message)
}

function start(command) {
  config = command
  room = null
  reconnectAttempts = 0
  connectSignal()
}

function stop() {
  config = null
  room = null
  clearTimeout(reconnectTimer)
  if (signal) signal.close()
  signal = null

  // guests get what's queued for them (the reason hosting ended) first
  peers.forEach((peer, peerId) => closePeer(peerId, true, false))
  reportStoppedWhenIdle()
}

function reportStoppedWhenIdle() {
  if (config) return
  if (peers.size === 0) emit({ type: "stopped" })
}

// --- signalling ---

// the query the Cloudflare Worker routes by (junon-signal's protocol.mjs)
function signalUrlFor(code) {
  let url = new URL(config.signalUrl)
  url.searchParams.set("v", String(config.signalVersion))
  url.searchParams.set("role", "host")
  if (code) url.searchParams.set("code", code)
  return url.toString()
}

function connectSignal() {
  let ws = new WebSocket(signalUrlFor(room && room.code))
  signal = ws
  let timeout = setTimeout(() => ws.close(), SIGNAL_TIMEOUT_MS)
  let lastPong = Date.now()
  let keepalive = null

  ws.onopen = () => {
    clearTimeout(timeout)
    lastPong = Date.now()
    keepalive = setInterval(() => {
      if (Date.now() - lastPong > KEEPALIVE_DEAD_MS) return ws.close()
      ws.send("ping")
    }, KEEPALIVE_MS)
    ws.send(JSON.stringify({
      type: "host",
      version: config.signalVersion,
      protocol: config.protocol,
      worldName: config.worldName,
      code: room ? room.code : undefined,
      token: room ? room.token : undefined,
      isPublic: config.isPublic === true,
      details: config.details
    }))
  }

  ws.onmessage = (event) => {
    if (event.data === "pong") {
      lastPong = Date.now()
      return
    }
    let message
    try {
      message = JSON.parse(event.data)
    } catch (e) {
      return
    }
    onSignal(ws, message)
  }

  ws.onclose = () => {
    clearTimeout(timeout)
    clearInterval(keepalive)
    if (signal !== ws || !config) return
    signal = null

    if (!room) {
      emit({ type: "failed", message: ws.errorMessage || "Can't reach the online co-op service. Check your internet connection, or host by address." })
      config = null
      return
    }

    // already-connected guests don't need the signalling server; new ones
    // can join again once the room is back
    let delay = Math.min(1000 * Math.pow(2, reconnectAttempts), MAX_RECONNECT_DELAY_MS)
    reconnectAttempts += 1
    reconnectTimer = setTimeout(() => { if (config) connectSignal() }, delay)
  }
}

function sendSignal(message) {
  if (signal && signal.readyState === WebSocket.OPEN) signal.send(JSON.stringify(message))
}

function setVisibility(command) {
  if (!config || !room || !signal || signal.readyState !== WebSocket.OPEN) {
    emit({ type: 'visibilityError', requestId: command.requestId, message: 'The online room is reconnecting. Try again shortly.' })
    return
  }
  sendSignal({ type: 'visibility', isPublic: command.isPublic, requestId: command.requestId })
}

function setDetails(command) {
  if (!config) return
  config.details = command.details
  sendSignal({ type: 'details', details: command.details })
}

function onSignal(ws, message) {
  if (message.type === "hosted") {
    reconnectAttempts = 0
    iceServers = Array.isArray(message.iceServers) ? message.iceServers : []
    let isNewCode = !room || room.code !== message.code
    room = { code: message.code, token: message.token }
    if (isNewCode) emit({ type: "room", code: message.code })
  } else if (message.type === 'visibility' && typeof message.isPublic === 'boolean') {
    config.isPublic = message.isPublic
    emit({ type: 'visibility', isPublic: message.isPublic, requestId: message.requestId })
  } else if (message.type === "error") {
    ws.errorMessage = String(message.message || "The online co-op service refused to host.")
  } else if (message.type === "peer") {
    addPeer(message.peerId)
  } else if (message.type === "signal") {
    onPeerSignal(message.peerId, message.data)
  } else if (message.type === "peerLeft") {
    // a guest that gave up before its channel opened
    let peer = peers.get(message.peerId)
    if (peer && !peer.isOpen) dropPeer(message.peerId)
  }
}

// --- peers ---

function addPeer(peerId) {
  if (typeof peerId !== "string" || peers.has(peerId)) return

  let pc = new RTCPeerConnection({ iceServers: iceServers })
  let peer = { pc: pc, channel: null, queue: [], queuedBytes: 0, isOpen: false, isClosing: false, inbox: [], timer: null }
  peer.timer = setTimeout(() => { if (!peer.isOpen) dropPeer(peerId) }, PEER_CONNECT_TIMEOUT_MS)
  peers.set(peerId, peer)

  pc.onicecandidate = (event) => {
    if (event.candidate) sendSignal({ type: "signal", peerId: peerId, data: { candidate: event.candidate.toJSON() } })
  }

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === "failed") dropPeer(peerId)
  }

  pc.ondatachannel = (event) => {
    if (!config || event.channel.label !== config.channelLabel || peer.channel) return event.channel.close()
    setUpChannel(peerId, peer, event.channel)
  }
}

async function onPeerSignal(peerId, data) {
  let peer = peers.get(peerId)
  if (!peer || !data) return

  try {
    if (data.sdp && data.sdp.type === "offer" && !peer.pc.remoteDescription) {
      await peer.pc.setRemoteDescription(data.sdp)
      await peer.pc.setLocalDescription(await peer.pc.createAnswer())
      sendSignal({ type: "signal", peerId: peerId, data: { sdp: peer.pc.localDescription.toJSON() } })
    } else if (data.candidate) {
      await peer.pc.addIceCandidate(data.candidate)
    }
  } catch (e) {
    // a guest that sends nonsense doesn't get in
    dropPeer(peerId)
  }
}

function setUpChannel(peerId, peer, channel) {
  peer.channel = channel
  channel.binaryType = "arraybuffer"
  channel.bufferedAmountLowThreshold = LOW_WATER_BYTES
  channel.onbufferedamountlow = () => flush(peerId, peer)

  channel.onopen = async () => {
    clearTimeout(peer.timer)
    let address = await remoteAddress(peer.pc)
    if (peers.get(peerId) !== peer) return

    peer.isOpen = true
    emit({ type: "open", peerId: peerId, address: address })
    peer.inbox.forEach((data) => emit({ type: "data", peerId: peerId, data: data }))
    peer.inbox = []
    // the guest is in: its place in the room can go to the next one
    sendSignal({ type: "drop", peerId: peerId })
  }

  channel.onmessage = (event) => {
    if (!(event.data instanceof ArrayBuffer)) return dropPeer(peerId)
    let data = new Uint8Array(event.data)
    // the hello can arrive while open looks up the address
    if (peer.isOpen) emit({ type: "data", peerId: peerId, data: data })
    else peer.inbox.push(data)
  }

  channel.onclose = () => dropPeer(peerId)
}

// The guest's address as this side reached it, for the server's per-address
// limits. Through a TURN relay it would be the relay's, which many guests
// share, so then there is none.
async function remoteAddress(pc) {
  try {
    let stats = await pc.getStats()
    let pair = null
    stats.forEach((report) => {
      if (report.type === "transport" && report.selectedCandidatePairId) pair = stats.get(report.selectedCandidatePairId)
    })
    if (!pair) {
      stats.forEach((report) => {
        if (!pair && report.type === "candidate-pair" && report.nominated && report.state === "succeeded") pair = report
      })
    }

    let remote = pair && stats.get(pair.remoteCandidateId)
    if (!remote || remote.candidateType === "relay") return null
    return remote.address || remote.ip || null
  } catch (e) {
    return null
  }
}

function send(peerId, chunks) {
  let peer = peers.get(peerId)
  if (!peer || !peer.isOpen || peer.isClosing) return

  chunks.forEach((chunk) => {
    peer.queue.push(chunk)
    peer.queuedBytes += chunk.byteLength
  })
  if (peer.queuedBytes > MAX_QUEUED_BYTES) return dropPeer(peerId)
  flush(peerId, peer)
}

function flush(peerId, peer) {
  let channel = peer.channel
  if (!channel || channel.readyState !== "open") return

  try {
    while (peer.queue.length > 0 && channel.bufferedAmount < HIGH_WATER_BYTES) {
      let chunk = peer.queue.shift()
      peer.queuedBytes -= chunk.byteLength
      channel.send(chunk)
    }
  } catch (e) {
    return dropPeer(peerId)
  }

  if (peer.isClosing && peer.queue.length === 0) channel.close()
}

// isGraceful: deliver what's queued first. isReported: tell main, for
// closes main didn't ask for
function closePeer(peerId, isGraceful, isReported) {
  let peer = peers.get(peerId)
  if (!peer) return

  if (!isGraceful || !peer.isOpen) return removePeer(peerId, peer, isReported)
  if (peer.isClosing) return

  // the channel closes once the queue is sent (flush); the connection once
  // the channel has delivered it (onclose)
  peer.isClosing = true
  peer.channel.onclose = () => removePeer(peerId, peer, false)
  clearTimeout(peer.timer)
  peer.timer = setTimeout(() => removePeer(peerId, peer, false), CLOSE_GRACE_MS)
  flush(peerId, peer)
}

function dropPeer(peerId) {
  closePeer(peerId, false, true)
}

function removePeer(peerId, peer, isReported) {
  if (peers.get(peerId) !== peer) return
  peers.delete(peerId)
  clearTimeout(peer.timer)
  peer.pc.close()

  if (isReported && peer.isOpen) emit({ type: "close", peerId: peerId })
  if (!peer.isOpen) sendSignal({ type: "drop", peerId: peerId })
  reportStoppedWhenIdle()
}
