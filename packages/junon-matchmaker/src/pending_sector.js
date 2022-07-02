class PendingSector {
  constructor(server, sectorId, requestId, options = {}) {
    this.requestId = requestId
    this.sectorId = sectorId
    this.server = server
    this.matchmaker = this.server.matchmaker

    this.options = {}

    this.language = options.language || "en"
    this.targetMiniGameId = options.targetMiniGameId

    this.queuedSockets = []

    this.register()
  }

  register() {
    this.server.pendingSectors[this.sectorId] = this.server.pendingSectors[this.sectorId] || {}
    this.server.pendingSectors[this.sectorId][this.requestId] = this
  }

  unregister() {
    this.server.pendingSectors[this.sectorId] = this.server.pendingSectors[this.sectorId] || {}
    delete this.server.pendingSectors[this.sectorId][this.requestId]

    if (Object.keys(this.server.pendingSectors[this.sectorId]).length === 0) {
      delete this.server.pendingSectors[this.sectorId]
    }
  }

  addQueue(socketId) {
    this.queuedSockets.push(socketId)
  }

  isNotFull() {
    return this.queuedSockets.length < this.getMaxPlayersForSector(this.sectorId)
  }

  isPrivate() {
    return this.options.isPrivate
  }

  getMaxPlayersForSector(sectorId) {
    return 5
  }

  remove() {
    this.unregister()
  }

  onCreateSuccess(data) {
    this.queuedSockets.forEach((socket) => {
      this.matchmaker.socketUtil.emit(socket, "JoinMiniGameStatus", data)
    })

    this.remove()
  }

  onCreateError(data) {
    this.queuedSockets.forEach((socket) => {
      this.matchmaker.socketUtil.emit(socket, "JoinMiniGameStatus", data)
    })

    this.remove()
  }

}

module.exports = PendingSector