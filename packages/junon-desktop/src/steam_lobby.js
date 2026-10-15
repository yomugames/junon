// Steam lobbies for co-op (docs/exec-plans/active/steam-coop.md, Milestone 3).
// A lobby is how friends find, are invited to and join a Steam-hosted world:
// while the host is in a joinable lobby, Steam shows "Join Game" in the
// friends list, and an accepted invite or Join Game reaches the friend's game
// as GameLobbyJoinRequested (or, if it wasn't running, as a launch with
// `+connect_lobby <id>`). Game traffic doesn't go through the lobby: the
// guest connects to the lobby owner over Steam Networking Sockets, and the
// host only accepts connections from lobby members (steam_host.js).

// ELobbyType
const LOBBY_PRIVATE = 0
const LOBBY_FRIENDS_ONLY = 1

const LOBBY_TYPES = { friends: LOBBY_FRIENDS_ONLY, invite: LOBBY_PRIVATE }

// EFriendFlags.Immediate: regular friends
const FRIEND_FLAGS_IMMEDIATE = 4

const STEAM_ID_PATTERN = /^[0-9]{1,20}$/

class SteamLobbies {
  // options: { onJoinRequest(lobbyId) }, for invites accepted and Join Game
  // clicked while the game runs
  constructor(runtime, options) {
    this.runtime = runtime
    this.sdk = runtime.sdk
    this.hostedLobbyId = null
    this.joinedLobbyId = null
    this.hostingToken = 0

    this.sdk.matchmaking.onGameLobbyJoinRequested((event) => {
      if (STEAM_ID_PATTERN.test(String(event.lobbyId))) options.onJoinRequest(String(event.lobbyId))
    })
    this.launchLobbyId = SteamLobbies.findLaunchLobby(process.argv) || this.sdk.matchmaking.getConnectLobbyIdFromCommandLine()
  }

  // Steam passes `+connect_lobby <id>` to a game it starts for an invite
  static findLaunchLobby(argv) {
    let index = argv.indexOf("+connect_lobby")
    let lobbyId = index >= 0 ? argv[index + 1] : null
    return lobbyId && STEAM_ID_PATTERN.test(lobbyId) ? lobbyId : null
  }

  // the lobby the game was launched to join, once
  takeLaunchLobby() {
    let lobbyId = this.launchLobbyId
    this.launchLobbyId = null
    return lobbyId
  }

  // Host. details: { worldName, lobbyType, maxMembers, protocolHash, version }
  // from the server's steamHosting message. Resolves to the lobby id, or null
  // if hosting ended meanwhile.
  async openLobby(details) {
    this.closeLobby()
    this.leaveJoinedLobby()
    let token = ++this.hostingToken

    let matchmaking = this.sdk.matchmaking
    let result = await matchmaking.createLobby(LOBBY_TYPES[details.lobbyType] ?? LOBBY_FRIENDS_ONLY, details.maxMembers)
    if (!result.success) throw new Error("Couldn't create a Steam lobby" + (result.error ? ": " + result.error : ""))

    if (token !== this.hostingToken) {
      matchmaking.leaveLobby(result.lobbyId)
      return null
    }

    let lobbyId = String(result.lobbyId)
    this.hostedLobbyId = lobbyId
    matchmaking.setLobbyData(lobbyId, "junon", "1")
    matchmaking.setLobbyData(lobbyId, "protocol", details.protocolHash)
    matchmaking.setLobbyData(lobbyId, "version", details.version || "")
    matchmaking.setLobbyData(lobbyId, "world", details.worldName || "")
    matchmaking.setLobbyJoinable(lobbyId, true)

    this.sdk.richPresence.setRichPresence("status", "Hosting " + (details.worldName || "a world"))
    this.sdk.richPresence.setRichPresence("steam_player_group", lobbyId)
    console.log("Steam: hosting lobby " + lobbyId)
    return lobbyId
  }

  closeLobby() {
    this.hostingToken++
    if (!this.hostedLobbyId) return

    this.sdk.matchmaking.leaveLobby(this.hostedLobbyId)
    this.hostedLobbyId = null
    this.sdk.richPresence.clearRichPresence()
    console.log("Steam: left the hosted lobby")
  }

  // the host accepts Steam connections only from its lobby's members
  isMember(steamId) {
    if (!this.hostedLobbyId) return false
    return this.sdk.matchmaking.getLobbyMembers(this.hostedLobbyId).includes(String(steamId))
  }

  openInviteDialog() {
    if (!this.hostedLobbyId) throw new Error("Not hosting on Steam")
    this.sdk.overlay.activateGameOverlayInviteDialog(this.hostedLobbyId)
  }

  // an invite in Steam chat, which works without the overlay
  invite(friendSteamId) {
    if (!this.hostedLobbyId) throw new Error("Not hosting on Steam")
    if (typeof friendSteamId !== "string" || !STEAM_ID_PATTERN.test(friendSteamId)) throw new Error("Invalid Steam id")
    if (!this.sdk.matchmaking.inviteUserToLobby(this.hostedLobbyId, friendSteamId)) throw new Error("Couldn't send the invite")
  }

  // Guest: joins a host's lobby and checks it is a Junon world of the same
  // version. Resolves to { hostSteamId, worldName }.
  async joinLobby(lobbyId, protocolHash) {
    if (typeof lobbyId !== "string" || !STEAM_ID_PATTERN.test(lobbyId)) throw new Error("Invalid lobby")
    if (this.hostedLobbyId) throw new Error("Stop hosting before joining another world")
    this.leaveJoinedLobby()

    let matchmaking = this.sdk.matchmaking
    let result = await matchmaking.joinLobby(lobbyId)
    if (!result.success) throw new Error(result.locked ? "That world isn't taking players." : "Couldn't join the world on Steam. It may have closed.")
    this.joinedLobbyId = lobbyId

    let data = matchmaking.getAllLobbyData(lobbyId)
    let hostSteamId = String(matchmaking.getLobbyOwner(lobbyId))
    if (data.junon !== "1" || !STEAM_ID_PATTERN.test(hostSteamId)) {
      this.leaveJoinedLobby()
      throw new Error("That Steam lobby isn't a Junon world.")
    }
    if (data.protocol !== protocolHash) {
      this.leaveJoinedLobby()
      throw new Error("Version mismatch: the host runs Junon " + (data.version || "another version") + ". Both players need the same version.")
    }

    this.sdk.richPresence.setRichPresence("status", "Playing in " + (data.world || "a friend's world"))
    this.sdk.richPresence.setRichPresence("steam_player_group", lobbyId)
    return { hostSteamId: hostSteamId, worldName: data.world || "" }
  }

  leaveJoinedLobby() {
    if (!this.joinedLobbyId) return

    this.sdk.matchmaking.leaveLobby(this.joinedLobbyId)
    this.joinedLobbyId = null
    this.sdk.richPresence.clearRichPresence()
  }

  // friends playing Junon in a lobby: [{ steamId, name, lobbyId, status }]
  listFriendsHosting() {
    let friends = this.sdk.friends
    let appId = String(this.runtime.appId)

    return friends.getAllFriends(FRIEND_FLAGS_IMMEDIATE).map((friend) => {
      let game = friends.getFriendGamePlayed(friend.steamId)
      if (!game || game.gameId !== appId || !game.steamIDLobby || game.steamIDLobby === "0") return null

      return {
        steamId: friend.steamId,
        name: friend.personaName,
        lobbyId: game.steamIDLobby,
        status: this.sdk.richPresence.getFriendRichPresence(friend.steamId, "status") || ""
      }
    }).filter(Boolean)
  }

  // [{ steamId, name }] of friends who are online, for the Host panel's
  // invite list
  listFriends() {
    // EPersonaState.Offline is 0
    return this.sdk.friends.getAllFriends(FRIEND_FLAGS_IMMEDIATE)
      .filter((friend) => friend.personaState !== 0)
      .map((friend) => ({ steamId: friend.steamId, name: friend.personaName }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  shutdown() {
    this.closeLobby()
    this.leaveJoinedLobby()
  }
}

SteamLobbies.LOBBY_TYPES = Object.keys(LOBBY_TYPES)

module.exports = SteamLobbies
