const SocketUtil = require("junon-common/socket_util")
const _ = require("lodash")
const LOG = require('junon-common/logger')

class Sector {
  constructor(server, data) {
    this.server = server
    this.matchmaker = server.node.region.matchmaker

    this.id = data.sectorId
    this.teams = {}
    this.data = data
    this.language = data.language || "en"

    this.players = {}

    if (this.isMiniGame()) {
      let miniGame = this.getMiniGame()
      if (miniGame) {
        miniGame.addSector(this)
      }
    }

    // not joined yet, but socket requested matchmaker
    // we remove any queue after a second, which is what i think is the 
    // time it takes to join server, and let matchmaker know user has joined
    this.queuedPlayers = {}
  }

  isPrivate() {
    return this.data.isPrivate
  }

  addPlayerJoinQueue(requestId) {
    this.queuedPlayers[requestId] = { timestamp: Date.now() }
  }

  addPlayer(identifier) {
    // this.players[identifier] = true
  }

  removePlayer(identifier) {
    // delete this.players[identifier] 
  }

  getMiniGame() {
    return this.matchmaker.getMiniGame(this.getMiniGameId())
  }

  getUid() {
    return this.id
  }

  isMiniGame() {
    return this.server.isMiniGame()
  }

  canAcceptPlayersMidGame() {
    return this.data.canAcceptPlayersMidGame
  }

  isMiniGameFor(sectorId) {
    if (!this.isMiniGame()) return false
    if (this.isRoundStarted) {
      if (this.canAcceptPlayersMidGame()) {
        if (this.getPlayerCount() >= 6) return false
      } else {
        return false
      }
    }

    return this.id.match(sectorId)
  }

  hasAvailableCapacity() {
    return this.getEstimatedPlayerCount() < this.getMaxPlayers()
  }

  getMaxPlayers() {
    if (this.data.maxPlayers) return this.data.maxPlayers
    return 7
  }

  getEstimatedPlayerCount() {
    return this.getPlayerCount() + this.getQueuedPlayerCount()
  }

  getQueuedPlayerCount() {
    for (let requestId in this.queuedPlayers)  {
      let duration = Date.now() - this.queuedPlayers[requestId].timestamp
      if (duration >= 800) {
        delete this.queuedPlayers[requestId]
      }
    }

    return Object.keys(this.queuedPlayers).length
  }

  getMiniGameId() {
    let match = this.id.match(/mini-(.*)-/)
    return match && match[1]
  }

  isPvP() {
    return this.data.gameMode && this.data.gameMode === 'pvp'
  }

  setRoundStarted(isRoundStarted) {
    this.isRoundStarted = isRoundStarted
  }

  updateTeam(data) {
    let prevTeam = this.teams[data.id]
    if (_.isEqual(prevTeam, data)) {
      return
    }

    if (data.members.length === 0) {
      delete this.teams[data.id]
    } else {
      this.teams[data.id] = data
    }

    let socketIds = this.getEnvironmentSocketIds()

    SocketUtil.broadcast(socketIds, "Team", data)
  }

  updateStatus(data) {
    this.data.status = data.status
  }

  update(data) {
    let oldPlayerCount = this.getPlayerCount()
    this.data = data
    let newPlayerCount = this.getPlayerCount()

    let socketIds = this.getEnvironmentSocketIds()
    let json = Object.assign({}, { id: this.id }, this.data)
    delete json["creatorIp"]
    SocketUtil.broadcast(socketIds, "SectorUpdated", json)

    if (newPlayerCount !== oldPlayerCount) {
      this.onPlayerCountChanged(oldPlayerCount, newPlayerCount)
    }
  }

  onPlayerCountIncreased(oldPlayerCount, newPlayerCount) {
    let numQueuedToDelete = newPlayerCount - oldPlayerCount
    for (let requestId in this.queuedPlayers) {
      if (numQueuedToDelete > 0) {
        delete this.queuedPlayers[requestId]
        numQueuedToDelete--
      }
    }
  }

  onPlayerCountChanged(oldPlayerCount, newPlayerCount) {
    if (newPlayerCount > oldPlayerCount) {
      this.onPlayerCountIncreased(oldPlayerCount, newPlayerCount)
    }
    this.server.onPlayerCountChanged(this)
    this.server.node.onPlayerCountChanged(this)
    this.server.region.onPlayerCountChanged(this)

    if (this.getMiniGame()) {
      this.getMiniGame().onPlayerCountChanged(this)
    }
  }

  getIp() {
    return this.data.ip  
  }

  getPlayerCount() {
    if (!this.data) return 0

    return this.data.playerCount  
  }

  remove() {
    LOG.info("removing sector " + this.id)
    this.server.onSectorRemoved(this.id)

    let socketIds = this.getEnvironmentSocketIds()
    SocketUtil.broadcast(socketIds, "RemoveSector", this.toJson())

    if (this.isMiniGame()) {
      let miniGame = this.getMiniGame()
      if (miniGame) {
        miniGame.removeSector(this)
      }
    }
  }

  getEnvironmentSocketIds() {
    return this.server.region.environment.getSocketIds()
  }

  getRegionName() {
    return this.data.region
  }

  toJson() {
    let json = this.toPodJson()
    return json
  }

  getPublicTeams() {
    return this.teams
  }

  toPodJson() {
    let json = Object.assign({}, { id: this.id, teams: this.getPublicTeams() }, this.data)
    return json
  }

  getTeamsJson() {
    return this.teams  
  }

  getServerJson() {
    return {
      ip: this.data.ip,
      playerCount: this.data.playerCount
    }
  }

}

module.exports = Sector