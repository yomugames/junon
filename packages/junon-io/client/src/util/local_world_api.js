// World management for the standalone local menu (server: Server#getLocalWorldApi).
// The desktop app's preload script exposes window.junonDesktop, which forwards
// calls to the game server process. A browser uses the loopback /local/* routes
// of the standalone page server instead.
const LocalWorldApi = {
  listWorlds() {
    return this.call('listWorlds', [], () => this.request('worlds'))
  },

  createWorld(details) {
    return this.call('createWorld', [details], () => this.request('worlds', this.json(details)))
  },

  openWorld(details) {
    return this.call('openWorld', [details], () => this.request('worlds/open', this.json(details)))
  },

  hostWorld(details) {
    return this.call('hostWorld', [details], () => this.request('host', this.json(details)))
  },

  // desktop only: the Steam lobby lives in the desktop app's main process
  hostWorldOnSteam(details) {
    return this.call('hostWorldOnSteam', [details], () => Promise.reject(new Error('Steam co-op needs the desktop app')))
  },

  // desktop only: the WebRTC peer connections live in the desktop app
  hostWorldOnline(details) {
    return this.call('hostWorldOnline', [details], () => Promise.reject(new Error('Online co-op needs the desktop app')))
  },

  // { hosting }: null when the world isn't hosted (Server#getHostingStatus)
  getHosting() {
    return this.call('getHosting', [], () => this.request('host'))
  },

  stopHosting() {
    return this.call('stopHosting', [], () => this.request('host/stop', this.json({})))
  },

  startTutorial(details) {
    return this.call('startTutorial', [details], () => this.request('tutorial', this.json(details)))
  },

  listImportCharacters(bytes) {
    return this.call('listImportCharacters', [new Uint8Array(bytes)], () => {
      return this.request('import/characters', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: bytes })
    })
  },

  importWorld(bytes, profile) {
    return this.call('importWorld', [new Uint8Array(bytes), profile], () => {
      return this.request('import', { method: 'POST', headers: { 'Content-Type': 'application/octet-stream', 'X-Junon-Owner': profile.ownerUid, 'X-Junon-Name': profile.ownerName, 'X-Junon-Character': profile.characterUid }, body: bytes })
    })
  },

  call(method, args, httpRequest) {
    if (window.junonDesktop) return window.junonDesktop.localWorldApi(method, args)
    return httpRequest()
  },

  async request(path, options) {
    const response = await fetch('/local/' + path, options)
    const body = await response.json()
    if (!response.ok) throw new Error(body.error || 'Request failed')
    return body
  },

  json(data) {
    return { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) }
  }
}

module.exports = LocalWorldApi
