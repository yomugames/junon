const Sector = require('./sector')
const FirebaseAdminHelper = require("./firebase_admin_helper")
const LOG = require('junon-common/logger')
const PendingSector = require("./pending_sector")

class Server {
  constructor(node, data) {
    this.node = node
    this.region = node.region
    this.matchmaker = this.region.matchmaker
    this.host = data.host
    this.revision = data.revision
    this.data = data

    this.playerSessions = {}
    this.sectors = {}
    this.reservations = {}

    this.pendingSectors = {}
  }

  addPendingSector(sectorId, requestId, options = {}) {
    return new PendingSector(this, sectorId, requestId, options)
  }

  getPendingSectorForRequestId(sectorId, requestId) {
    if (sectorId) {
      let match = sectorId.match(/mini-(.*)-/)
      if (match) {
        sectorId = match[1]
      }    

      let pendingSectorsByRequestId = this.pendingSectors[sectorId]
      if (!pendingSectorsByRequestId) return null
        
      return pendingSectorsByRequestId[requestId]
    } else {
      // find by requestId
      let result = null
      for (let sectorId in this.pendingSectors) {
        let pendingSectorsByRequestId = this.pendingSectors[sectorId]
        for (let requestId in pendingSectorsByRequestId) {
          if (pendingSectorsByRequestId[requestId]) {
            result = pendingSectorsByRequestId[requestId]
            break
          }
        }
      }
      return result
    }

  }

  getJoinablePendingSector(sectorId, options = {}) {
    let result

    let pendingSectors = this.pendingSectors[sectorId]
    for (let requestId in pendingSectors) {
      let pendingSector = pendingSectors[requestId]
      if (pendingSector.isNotFull() ) {
        if (options.targetMiniGameId) {
          if (pendingSector.targetMiniGameId === options.targetMiniGameId) {
            result = pendingSector
            break
          }
        } else if (pendingSector.language === options.language) {
          if (!pendingSector.isPrivate()) {
            result = pendingSector
            break
          }
        }
      }
    }

    return result
  }

  increasePlayerQueueToPendingSector(sectorId) {
    if (!this.pendingSectors[sectorId]) return

    this.pendingSectors[sectorId].numPlayersQueued++
  }

  getFirebaseServerKey() {
    return this.host.replace(".junon.io", "")
  }

  isMiniGame() {
    return this.node.isMiniGame()
  }

  getHost() {
    return this.host
  }

  reserveSpot(sectorId) {
    this.reservations[sectorId] = Date.now()
  }

  removeReservation(sectorId) {
    delete this.reservations[sectorId]
  }

  isPvP() {
    let sector = Object.values(this.sectors)[0]
    if (!sector) return false

    return sector.isPvP()
  }

  getPvPSector() {
    let sector = Object.values(this.sectors)[0]
    return sector
  }

  clearOldReservations() {
    for (let sectorId in this.reservations) {
      let timestamp = this.reservations[sectorId]
      let isOld = Date.now() - timestamp > 60 * 1000
      if (isOld) {
        delete this.reservations[sectorId]
      }
    }
  }

  triggerRestart() {
    if (this.isPvP()) return
      
    let thirtySeconds = 30 * 1000

    clearTimeout(this.restartTimeout)

    this.restartTimeout = setTimeout(() => {
      this.restart()
    }, thirtySeconds)
  }

  restart() {
    if (debugMode) return // restart only for production/staging mode
    if (!this.getSocket()) return

    this.isRestarting = true

    this.matchmaker.socketUtil.emit(this.getSocket(), "Restart", {})
  }

  restartIfOldRevisionAndZeroPlayers() {
    if (this.isOldRevision() && this.getSectorCount() === 0) {
      this.triggerRestart()
    }
  }

  getSocket() {
    return this.data.socket
  }

  onPlayerCountChanged(sector) {
    let serverPlayerCount = this.getPlayerCount()    
    if (serverPlayerCount === 0 && this.lastServerPlayerCount !== 0) {
      this.onPlayerCountReducedToZero()  
    }

    if (serverPlayerCount > 0) {
      this.onPlayerCountAboveZero()
    }

    if (this.isOldRevision() && !this.isMiniGame()) {
      this.rebootOldServersDelayed()
    }

    this.lastServerPlayerCount = serverPlayerCount
  }

  rebootOldServersDelayed() {
    //9am and above
    let shouldRestartNow = false //(new Date()).getHours() > 13
    if (shouldRestartNow) {
      this.matchmaker.socketUtil.emit(this.getSocket(), "Restart", {
        isDelayed: true,
        reason: "Server Update Available. Rebooting",
        seconds: 150
      })
    }
  }

  onSectorCountChanged() {
    let sectorCount = this.getSectorCount()
    if (sectorCount === 0 ) {
      this.onSectorCountReducedToZero()
    } else {
      this.onSectorCountAboveZero()
    }

  }

  onPlayerCountAboveZero() {
  }

  onPlayerCountReducedToZero() {
  }

  onSectorCountAboveZero() {
    clearTimeout(this.restartTimeout)  
  }

  onSectorCountReducedToZero() {
    if (this.isOldRevision()) {
      this.triggerRestart()
      return
    }

    if (this.isHighMemoryOnZeroPlayers()) {
      LOG.info(`[restarting][${this.host}] due to high memory on zero players: ${this.data.memory}`)
      this.triggerRestart()
      return
    }
  }

  isHighMemoryOnZeroPlayers() {
    return this.data.memory > 250
  }

  isHighMemory() {
    if (this.getSectorCount() >= 7) {
      return this.data.memory > 700
    } else {
      return this.data.memory > 500
    }
  }

  isOldRevision() {
    if (debugMode) return false
    return this.revision !== this.node.revision
  }

  getHostName() {
    let host = this.data.host.replace(".junon.io", "")
    return host.split(":")[0]
  }

  update(data) {
    this.data = data
  }

  getSector(sectorId) {
    return this.sectors[sectorId]  
  }

  getSectorCount() {
    return Object.keys(this.sectors).length
  }

  isTemporaryUnavailable() {
    if (this.isRestarting) return true
    if (this.isHighMemory()) return true
    if (this.isOldRevision()) return true

    return false
  }

  isAvailable(options = {}) {
    if (this.isTemporaryUnavailable()) return false
    this.clearOldReservations()
  
    if (!debugMode && this.isPvP()) return false

    if (debugMode) {
      return this.getReservedSectorCount() <= 10
    }
    
    if (options.isTutorial) {
      if (this.isMiniGame()) return false
      // pod can handle multiple games at a time
      return this.getReservedSectorCount() < 25
    } else if (options.isMiniGame) {
      // minigames 10 sectors per process (can handle 2gb i think)
      // 100 players per process. 16*200 = 1600 players per $100 sever

      return this.getReservedSectorCount() < 10
    } else {
      // pod can handle 1 game at a time only
      return this.getReservedSectorCount() < MAX_SECTORS_PER_SERVER
    }
  }

  getReservedSectorCount() {
    // account for sectors/games that are still booting and not yet in matchmaker
    let reservationCount = Object.keys(this.reservations).length
    return reservationCount + this.getSectorCount()
  }

  getStatusData() {
    let gameCount = Object.keys(this.sectors).length
    let data = Object.assign({}, this.data, { gameCount: gameCount })
    return data
  }

  getSectorsJson() {
    let json = {}

    for (let sectorId in this.sectors) {
      let sector = this.sectors[sectorId]
      json[sectorId] = sector.toJson()
    }

    return json
  }

  addPlayerSession(uid) {
    this.playerSessions[uid] = uid
  }

  removePlayerSession(uid) {
    delete this.playerSessions[uid] 
  }

  addSector(data) {
    LOG.info("adding sector " + data.sectorId + " to " + data.host)
    let sector = new Sector(this, data)
    this.sectors[data.sectorId] = sector

    this.removeReservation(data.sectorId)

    this.region.registerPlayerCreateGame(sector.data)

    let sectorIds = Object.keys(this.sectors)

    if (!global.isOffline) {
      FirebaseAdminHelper.setServerSectors(this.region.name, this.getFirebaseServerKey(), sectorIds)
    }

    this.onSectorCountChanged()

    return sector
  }

  removeSector(sectorId) {
    let sector = this.sectors[sectorId]
    if (sector) {
      sector.remove()
    }
  }

  onSectorRemoved(sectorId) {
    let sector = this.sectors[sectorId]
    if (sector) {
      this.region.unregisterPlayerCreateGame(sector.data)
    }
    
    delete this.sectors[sectorId]

    this.onSectorCountChanged()

    if (!global.isOffline) {
      FirebaseAdminHelper.removeSectorFromServer(this.region.name, this.getFirebaseServerKey(), sectorId)
    }
  }

  getMiniGame(targetSectorId, options = {}) {
    let result = null

    for (let sectorId in this.sectors) {
      let sector = this.sectors[sectorId]
      if (sector.isMiniGameFor(targetSectorId) &&
          sector.hasAvailableCapacity() &&
          !sector.isPrivate() &&
          sectorId !== options.prevMiniGameId) {
        if (options.targetMiniGameId) {
          // specific minigame instance
          if (sector.id === options.targetMiniGameId) {
            result = sector
            break
          }
        } else if (sector.language === options.language) {
          result = sector
          break
        }
      }
    }

    return result
  }

  getPlayerCount() {
    if (!this.data) return 0

    return this.data.playerCount  
  }

  getPvPPlayerCapacity() {
    return 50
  }

  getCapacity() {
    if (this.isPvP()) return 1 // 1 game only

    if (this.isHighMemory()) {
      return this.getSectorCount() 
    } else {
      return MAX_SECTORS_PER_SERVER 
    }
  }

  remove() {
    if (this.getPlayerCount() > 0) {
      this.node.region.addDisconnectedServer(this.node.name, this)
    }

    delete this.node.servers[this.getHost()]    
    this.region.matchmaker.removeOnlinePlayers(this.host)

    for (let playerUid in this.playerSessions) {
      this.region.removePlayerSession(playerUid)
    }

    let sectorIds = Object.keys(this.sectors).join(",")
    LOG.info("server " + this.host + " is being removed. Removing its sectors. " + sectorIds)
    for (let sectorId in this.sectors) {
      let sector = this.sectors[sectorId]
      sector.remove()
    }
  }


}

module.exports = Server