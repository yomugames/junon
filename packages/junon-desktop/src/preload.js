const { contextBridge, ipcRenderer } = require("electron")

// The only privileged API the game page gets: world management for the local
// menu (client/src/util/local_world_api.js). Everything else, including game
// traffic, goes over the ordinary game socket.
contextBridge.exposeInMainWorld("junonDesktop", {
  async localWorldApi(method, args) {
    let response = await ipcRenderer.invoke("junon:local-world-api", method, args)
    if (response.error) throw new Error(response.error)
    return response.result
  }
})
