// Steam co-op lobbies, friends and invites, from the desktop app's main
// process (packages/junon-desktop/src/steam_lobby.js, through preload.js).
// Outside the desktop app, or without Steam, isAvailable() is false and the
// menus show no Steam controls.
const SteamCoop = {
  isAvailable() {
    return !!(window.junonDesktop && window.junonDesktop.steam)
  },

  call(method, ...args) {
    if (!this.isAvailable()) return Promise.reject(new Error('Steam is not available'))
    return window.junonDesktop.steam.call(method, ...args)
  },

  // { isAvailable, steamId, personaName, pendingLobbyId }
  async getStatus() {
    if (!this.isAvailable()) return { isAvailable: false }
    try {
      return await this.call('getStatus')
    } catch (e) {
      return { isAvailable: false }
    }
  },

  onJoinRequest(handler) {
    if (this.isAvailable()) window.junonDesktop.steam.onJoinRequest(handler)
  },

  // [{ steamId, name, lobbyId, status }]
  listFriendsHosting() {
    return this.call('listFriendsHosting')
  },

  // [{ steamId, name }], online friends
  listFriends() {
    return this.call('listFriends')
  },

  invite(friendSteamId) {
    return this.call('invite', friendSteamId)
  },

  openInviteDialog() {
    return this.call('openInviteDialog')
  },

  // checks the host's version; resolves to { hostSteamId, worldName }
  joinLobby(lobbyId) {
    return this.call('joinLobby', lobbyId, window.protocolHash)
  },

  leaveLobby() {
    return this.call('leaveLobby')
  }
}

module.exports = SteamCoop
