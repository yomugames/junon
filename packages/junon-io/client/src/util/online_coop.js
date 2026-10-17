const RtcTransport = require('junon-common/rtc_transport')

const LOOKUP_TIMEOUT_MS = 10 * 1000

// Online (WebRTC) co-op: where the signalling server is, from the desktop app
// (packages/junon-desktop/src/main.js, through preload.js), and room checks
// against it (packages/junon-signal). Outside the desktop app, or in a build
// without a signalling server, isAvailable is false and the menus show no
// online controls.
const OnlineCoop = {
  // { isAvailable, signalUrl }
  async getStatus() {
    if (!window.junonDesktop || !window.junonDesktop.online) return { isAvailable: false }
    try {
      return await window.junonDesktop.online.getStatus()
    } catch (e) {
      return { isAvailable: false }
    }
  },

  unreachableMessage() {
    return 'Can\'t reach the online co-op service. Check your internet connection, or join by address.'
  },

  versionMismatchMessage() {
    const ownVersion = (document.querySelector('.game_version') || {}).textContent || 'another version'
    return 'Version mismatch: the host runs a different version of Junon than yours (' + ownVersion + '). Both players need the same version.'
  },

  async listRooms() {
    const status = await this.getStatus()
    if (!status.isAvailable) throw new Error('Online co-op is not available')
    const url = new URL(status.signalUrl)
    url.protocol = url.protocol === 'wss:' ? 'https:' : 'http:'
    url.pathname = '/rooms'
    url.search = ''
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS)
    try {
      const response = await fetch(url.toString(), { signal: controller.signal, cache: 'no-store' })
      if (!response.ok) throw new Error('The online co-op service does not support the server browser')
      const data = await response.json()
      return Array.isArray(data.rooms) ? data.rooms.filter((room) => room &&
        RtcTransport.normalizeRoomCode(room.code) === room.code &&
        room.protocol === window.protocolHash && typeof room.worldName === 'string').slice(0, 100).map((room) => {
        const validCount = Number.isInteger(room.playerCount) && Number.isInteger(room.maxPlayers) &&
          room.playerCount >= 0 && room.maxPlayers > 0 && room.maxPlayers <= 100 && room.playerCount <= room.maxPlayers
        const thumbnail = typeof room.thumbnail === 'string' && room.thumbnail.length <= 8215 &&
          /^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(room.thumbnail) ? room.thumbnail : null
        return {
          code: room.code,
          worldName: room.worldName,
          playerCount: validCount ? room.playerCount : null,
          maxPlayers: validCount ? room.maxPlayers : null,
          thumbnail: thumbnail
        }
      }) : []
    } catch (e) {
      if (e.name === 'AbortError' || e instanceof TypeError) throw new Error(this.unreachableMessage())
      throw e
    } finally {
      clearTimeout(timeout)
    }
  },

  getVisibility() {
    return window.junonDesktop.online.getVisibility()
  },

  setVisibility(isPublic) {
    return window.junonDesktop.online.setVisibility(isPublic)
  },

  // checks that a room exists and runs this version, so problems get a clear
  // message before the menu closes; resolves to { worldName }
  async checkRoom(code) {
    const status = await this.getStatus()
    if (!status.isAvailable) throw new Error('Online co-op is not available')

    const room = await new Promise((resolve, reject) => {
      const ws = new WebSocket(RtcTransport.signalUrl(status.signalUrl, 'lookup', code))
      const timeout = setTimeout(() => ws.close(), LOOKUP_TIMEOUT_MS)
      let answer = null
      ws.onopen = () => ws.send(JSON.stringify({ type: 'lookup', version: RtcTransport.SIGNAL_PROTOCOL_VERSION, code: code }))
      ws.onmessage = (event) => {
        try { answer = JSON.parse(event.data) } catch (e) { answer = null }
      }
      ws.onclose = () => {
        clearTimeout(timeout)
        if (answer && answer.type === 'room') resolve(answer)
        else reject(new Error(answer && answer.type === 'error' ? String(answer.message) : this.unreachableMessage()))
      }
    })

    if (room.protocol !== window.protocolHash) throw new Error(this.versionMismatchMessage())
    return { worldName: room.worldName }
  }
}

module.exports = OnlineCoop
