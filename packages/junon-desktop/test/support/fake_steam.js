// An in-memory stand-in for the parts of Steam that Junon's Steam co-op uses
// (src/steam.js, steam_host.js, steam_guest.js, steam_lobby.js): Networking
// Sockets P2P, lobbies, friends, rich presence and the overlay invite dialog.
// One FakeSteamNetwork connects several FakeSteamSdk users in one process.
//
// test/steam_relay.spec.js uses it directly. The desktop app loads it in
// place of steamworks-ffi-node when JUNON_STEAM_FAKE_SDK points at this file
// (src/steam.js); JUNON_FAKE_STEAM then holds the scenario as JSON (see the
// bottom of this file), and the SDK is `global.junonFakeSteam` in main, for
// tests to inspect with electronApp.evaluate.

const CONNECTING = 1
const CONNECTED = 3
const CLOSED_BY_PEER = 4

// One Steam network shared by every endpoint. Each endpoint has the subset of
// steamworks-ffi-node's networkingSockets API that the relays use.
class FakeSteamNetwork {
  // sendBufferBytes: Steam's reliable send buffer (512 KB by default)
  constructor(options = {}) {
    this.sendBufferBytes = options.sendBufferBytes || 512 * 1024
    this.appId = String(options.appId || 480)
    this.lobbies = new Map()
    this.nextLobbyId = 109775240000000001n
    this.connections = new Map()
    this.endpoints = new Map()
    this.nextHandle = 1
    this.refusedSends = 0
  }

  endpoint(steamId) {
    const network = this
    const endpoint = {
      steamId,
      listenSockets: new Set(),
      pollGroups: new Map(),
      requestHandlers: [],
      stateHandlers: [],
      events: [],

      createListenSocketP2P() {
        const handle = network.nextHandle++
        endpoint.listenSockets.add(handle)
        return handle
      },
      closeListenSocket(handle) { endpoint.listenSockets.delete(handle); return true },
      createPollGroup() {
        const handle = network.nextHandle++
        endpoint.pollGroups.set(handle, new Set())
        return handle
      },
      destroyPollGroup(handle) { endpoint.pollGroups.delete(handle); return true },
      setConnectionPollGroup(connection, group) { endpoint.pollGroups.get(group).add(connection); return true },

      connectP2P(remoteSteamId) {
        const remote = network.endpoints.get(String(remoteSteamId))
        const listenSocket = remote && Array.from(remote.listenSockets)[0]
        const local = network.addConnection(endpoint, String(remoteSteamId), 0)
        if (!listenSocket) {
          endpoint.events.push(() => network.changeState(local, CLOSED_BY_PEER))
          return local.handle
        }

        const incoming = network.addConnection(remote, steamId, listenSocket)
        local.peer = incoming
        incoming.peer = local
        remote.events.push(() => {
          network.changeState(incoming, CONNECTING)
          remote.requestHandlers.forEach((handler) => handler({ connection: incoming.handle, identityRemote: steamId, listenSocket }))
        })
        return local.handle
      },
      acceptConnection(handle) {
        const connection = network.connections.get(handle)
        network.changeState(connection, CONNECTED)
        connection.peer.owner.events.push(() => network.changeState(connection.peer, CONNECTED))
        return 1
      },
      closeConnection(handle) {
        const connection = network.connections.get(handle)
        if (!connection || connection.isClosed) return true
        connection.isClosed = true
        const peer = connection.peer
        // reliable data already sent still arrives, then the close
        if (peer && !peer.isClosed) peer.owner.events.push(() => network.changeState(peer, CLOSED_BY_PEER))
        return true
      },
      sendMessage(handle, data) {
        const connection = network.connections.get(handle)
        if (!connection || connection.isClosed || connection.state !== CONNECTED || connection.peer.isClosed) return { success: false, result: 3 }
        // like Steam, one message always fits in an empty buffer
        if (connection.unackedBytes > 0 && connection.unackedBytes + data.length > network.sendBufferBytes) {
          network.refusedSends++
          return { success: false, result: 25 }
        }
        connection.unackedBytes += data.length
        connection.peer.inbox.push(Buffer.from(data))
        return { success: true, result: 1 }
      },
      receiveMessages(handle, max) {
        const connection = network.connections.get(handle)
        return connection ? network.take(connection, max) : []
      },
      receiveMessagesOnPollGroup(group, max) {
        const messages = []
        endpoint.pollGroups.get(group).forEach((handle) => messages.push(...network.take(network.connections.get(handle), max)))
        return messages
      },
      onConnectionRequest(handler) { endpoint.requestHandlers.push(handler) },
      onConnectionStateChange(handler) { endpoint.stateHandlers.push(handler) }
    }

    this.endpoints.set(steamId, endpoint)
    return endpoint
  }

  addConnection(owner, identityRemote, listenSocket) {
    const connection = { handle: this.nextHandle++, owner, identityRemote, listenSocket, state: 0, inbox: [], unackedBytes: 0, isClosed: false }
    this.connections.set(connection.handle, connection)
    return connection
  }

  changeState(connection, state) {
    if (connection.state === state) return
    const oldState = connection.state
    connection.state = state
    const change = { connection: connection.handle, oldState, newState: state, info: { identityRemote: connection.identityRemote, listenSocket: connection.listenSocket } }
    connection.owner.stateHandlers.forEach((handler) => handler(change))
  }

  take(connection, max) {
    const messages = connection.inbox.splice(0, max).map((data) => ({ data, connection: connection.handle }))
    // the peer acknowledges what this side read
    if (connection.peer) connection.peer.unackedBytes = Math.max(0, connection.peer.unackedBytes - messages.reduce((sum, message) => sum + message.data.length, 0))
    return messages
  }
}

// A Steam user on the network, with the subset of steamworks-ffi-node's
// SteamworksSDK that src/steam*.js call. Lobby membership changes reach other
// members on their next callback run, as in Steam. `calls` records invites,
// overlay dialogs and rich presence.
class FakeSteamSdk {
  // options: { personaName, friends: [steamId], launchLobbyId }
  constructor(network, steamId, options = {}) {
    this.network = network
    this.steamId = steamId
    this.personaName = options.personaName || 'Player ' + steamId.slice(-2)
    this.friendIds = options.friends || []
    this.launchLobbyId = options.launchLobbyId || null
    this.richPresenceData = {}
    this.calls = []
    this.joinRequestHandlers = []
    network.users = network.users || new Map()
    network.users.set(steamId, this)

    const sdk = this
    this.networkingSockets = Object.assign(network.endpoint(steamId), {
      runCallbacks() {
        sdk.networkingSockets.events.splice(0).forEach((event) => event())
      },
      closeAll() {}
    })
    this.networkingUtils = { initRelayNetworkAccess() {} }

    this.friends = {
      getPersonaName: () => sdk.personaName,
      getAllFriends: () => sdk.friendIds.map((id) => {
        const friend = network.users.get(id)
        return { steamId: id, personaName: friend ? friend.personaName : id, personaState: friend ? 1 : 0, relationship: 3 }
      }),
      getFriendGamePlayed: (id) => {
        const lobby = Array.from(network.lobbies.values()).find((entry) => entry.members.includes(id))
        if (!network.users.has(id)) return null
        return { gameId: network.appId, gameIP: 0, gamePort: 0, queryPort: 0, steamIDLobby: lobby ? lobby.id : '0' }
      }
    }

    this.richPresence = {
      setRichPresence: (key, value) => { sdk.richPresenceData[key] = value; return true },
      clearRichPresence: () => { sdk.richPresenceData = {} },
      getFriendRichPresence: (id, key) => {
        const friend = network.users.get(id)
        return (friend && friend.richPresenceData[key]) || ''
      }
    }

    this.overlay = {
      activateGameOverlayInviteDialog: (lobbyId) => sdk.calls.push({ type: 'inviteDialog', lobbyId: String(lobbyId) })
    }

    this.matchmaking = {
      createLobby: async (lobbyType, maxMembers) => {
        const id = String(network.nextLobbyId++)
        network.lobbies.set(id, { id, owner: steamId, type: lobbyType, maxMembers, members: [steamId], data: {}, joinable: true })
        return { success: true, lobbyId: id }
      },
      joinLobby: async (lobbyId) => {
        const lobby = network.lobbies.get(String(lobbyId))
        if (!lobby || !lobby.joinable) return { success: false, response: 2, locked: false }
        const isFriendOfOwner = (network.users.get(lobby.owner).friendIds || []).includes(steamId)
        const isInvited = (lobby.invited || []).includes(steamId)
        // Private (0) needs an invite; FriendsOnly (1) a friendship
        if ((lobby.type === 0 && !isInvited) || (lobby.type === 1 && !isFriendOfOwner && !isInvited)) return { success: false, response: 3, locked: false }
        // the others see the new member when their callbacks next run
        lobby.members.forEach((member) => {
          const user = network.users.get(member)
          user.networkingSockets.events.push(() => { if (!lobby.members.includes(steamId)) lobby.members.push(steamId) })
        })
        lobby.pendingMembers = (lobby.pendingMembers || []).concat(steamId)
        return { success: true, lobbyId: lobby.id, response: 1, locked: false }
      },
      leaveLobby: (lobbyId) => {
        const lobby = network.lobbies.get(String(lobbyId))
        if (!lobby) return
        lobby.members = lobby.members.filter((member) => member !== steamId)
        lobby.pendingMembers = (lobby.pendingMembers || []).filter((member) => member !== steamId)
        if (lobby.owner === steamId) lobby.owner = lobby.members[0]
        if (!lobby.members.length && !lobby.pendingMembers.length) network.lobbies.delete(lobby.id)
      },
      setLobbyData: (lobbyId, key, value) => { network.lobbies.get(String(lobbyId)).data[key] = value; return true },
      getAllLobbyData: (lobbyId) => Object.assign({}, (network.lobbies.get(String(lobbyId)) || {}).data),
      getLobbyOwner: (lobbyId) => (network.lobbies.get(String(lobbyId)) || {}).owner || '0',
      getLobbyMembers: (lobbyId) => ((network.lobbies.get(String(lobbyId)) || {}).members || []).slice(),
      setLobbyJoinable: (lobbyId, joinable) => { network.lobbies.get(String(lobbyId)).joinable = joinable; return true },
      inviteUserToLobby: (lobbyId, friendId) => {
        const lobby = network.lobbies.get(String(lobbyId))
        lobby.invited = (lobby.invited || []).concat(friendId)
        sdk.calls.push({ type: 'invite', lobbyId: String(lobbyId), steamId: friendId })
        return true
      },
      onGameLobbyJoinRequested: (handler) => { sdk.joinRequestHandlers.push(handler) },
      getConnectLobbyIdFromCommandLine: () => sdk.launchLobbyId
    }
  }

  init() { return true }
  getStatus() { return { initialized: true, appId: Number(this.network.appId), steamId: this.steamId } }
  setSdkPath() {}
  runCallbacks() {}
  shutdown() {}

  // a friend's invite accepted, or Join Game clicked, in the Steam client
  requestJoin(lobbyId, friendSteamId) {
    this.joinRequestHandlers.forEach((handler) => handler({ lobbyId: String(lobbyId), friendSteamId }))
  }
}

module.exports = { FakeSteamNetwork, FakeSteamSdk }

// Loaded by the desktop app (JUNON_STEAM_FAKE_SDK): the player is
// JUNON_FAKE_STEAM.steamId, and `others` are Steam users on the same fake
// network, each optionally hosting a lobby with the given lobby data, e.g.
// { steamId, others: [{ steamId, personaName, hostsLobby: { protocol } }] }.
// Other users only exist in this process: they can host a lobby the player
// sees and joins, but not carry game traffic.
module.exports.default = {
  getInstance() {
    if (global.junonFakeSteam) return global.junonFakeSteam

    const scenario = JSON.parse(process.env.JUNON_FAKE_STEAM || '{}')
    const network = new FakeSteamNetwork()
    const others = scenario.others || []
    const sdk = new FakeSteamSdk(network, scenario.steamId || '76561198000000001', {
      personaName: scenario.personaName,
      friends: others.map((other) => other.steamId)
    })
    others.forEach((other) => {
      const user = new FakeSteamSdk(network, other.steamId, { personaName: other.personaName, friends: [sdk.steamId] })
      if (other.hostsLobby) {
        const id = String(network.nextLobbyId++)
        network.lobbies.set(id, { id, owner: other.steamId, type: 1, maxMembers: 20, members: [other.steamId], data: Object.assign({ junon: '1', world: other.personaName + "'s world" }, other.hostsLobby), joinable: true })
        user.richPresenceData.status = 'Hosting ' + other.personaName + "'s world"
      }
    })
    if (scenario.launchLobby) sdk.launchLobbyId = Array.from(network.lobbies.keys())[0]

    global.junonFakeSteam = sdk
    return sdk
  }
}
