const { contextBridge, ipcRenderer } = require("electron")

// Steam co-op guest sockets (steam_guest.js): socket id -> handlers
const steamSockets = new Map()

ipcRenderer.on("junon:steam-socket", (event, socketId, socketEvent) => {
  let handlers = steamSockets.get(socketId)
  if (!handlers) return

  if (socketEvent.type === "open") handlers.onOpen()
  if (socketEvent.type === "message") handlers.onMessage(socketEvent.kind, socketEvent.data)
  if (socketEvent.type === "close") {
    steamSockets.delete(socketId)
    handlers.onClose(socketEvent.reason, !!socketEvent.wasOpen)
  }
})

// The only privileged API the game page gets: world management for the local
// menu (client/src/util/local_world_api.js), and Steam co-op
// (client/src/util/steam_socket.js). Game traffic goes over the ordinary game
// socket, or for a Steam guest over Steam through main.
contextBridge.exposeInMainWorld("junonDesktop", {
  async localWorldApi(method, args) {
    let response = await ipcRenderer.invoke("junon:local-world-api", method, args)
    if (response.error) throw new Error(response.error)
    return response.result
  },

  steam: {
    // getStatus() -> { isAvailable, steamId, personaName, pendingLobbyId };
    // listFriends, listFriendsHosting, invite(friendSteamId),
    // openInviteDialog, joinLobby(lobbyId, protocolHash), leaveLobby
    // (main.js, steam_lobby.js)
    async call(method, ...args) {
      let response = await ipcRenderer.invoke("junon:steam-api", method, args)
      if (response.error) throw new Error(response.error)
      return response.result
    },

    // handler(lobbyId): an invite accepted or Join Game clicked in Steam
    onJoinRequest(handler) {
      ipcRenderer.on("junon:steam-join-request", (event, lobbyId) => handler(lobbyId))
    },

    // handlers: { onOpen(), onMessage(kind, data), onClose(reason, wasOpen) };
    // kind 0 is text (a string), 1 binary (bytes). Returns { send, close }.
    async openSocket(hostSteamId, protocolHash, handlers) {
      let response = await ipcRenderer.invoke("junon:steam-socket-open", hostSteamId, protocolHash)
      if (response.error) throw new Error(response.error)

      let socketId = response.result
      steamSockets.set(socketId, handlers)

      return {
        send(kind, data) {
          ipcRenderer.send("junon:steam-socket-send", socketId, kind, data)
        },
        close() {
          steamSockets.delete(socketId)
          ipcRenderer.send("junon:steam-socket-close", socketId)
        }
      }
    }
  }
})
