const Server = require('./server')
const FirebaseAdminHelper = require("./firebase_admin_helper")
const SectorModel = require("junon-common/db/sector")
const LOG = require('junon-common/logger')
const ExceptionReporter = require("junon-common/exception_reporter")

class Node {
  constructor(region, name) {
    this.region = region
    this.name = name
    this.matchmaker = this.region.matchmaker
    this.servers = {}

    if (!global.isOffline) {
      this.onNodeRevisionListener = this.onNodeRevision.bind(this)
      this.nodeRevisionRef = FirebaseAdminHelper.watchNodeRevision(region.name, this.name, this.onNodeRevisionListener)
    }

    // not really accurate (since its based on matchmaker code)
    // but at least its conservative. 
    this.createTime = Date.now() 
  }

  canBeShutdown() {
    if (this.isDedicatedNode()) return false

    let aliveDuration = Date.now() - this.createTime
    let thirtyMinutes = 30 * 60 * 1000
    return this.getPlayerCount() === 0 && aliveDuration > thirtyMinutes
  }

  isDedicatedNode() {
    return this.name.split("-")[0] === "prime"    
  }

  getPriorityScore(isTutorial) {
    let sectorCount = this.getSectorCount(isTutorial)
    let extraFactor = this.isDedicatedNode() ? 1000 : 1

    return sectorCount + extraFactor
  }

  onNodeRevision(revision) {
    if (!revision) return

    this.revision = revision
    this.replaceOldRevisionServers()
  }

  replaceOldRevisionServers() {
    this.forEachServer((server) => {
      server.restartIfOldRevisionAndZeroPlayers()
    })
  }

  onPlayerCountChanged(sector) {
    let nodePlayerCount = this.getPlayerCount()    
    if (nodePlayerCount === 0 && this.lastNodePlayerCount !== 0) {
      this.onPlayerCountReducedToZero()  
    }

    this.lastNodePlayerCount = nodePlayerCount
  }

  onPlayerCountReducedToZero() {
    if (this.region.getNodeCount() === 1) return

    let amountOfTimeForScalingManagerToMarkNodeAsTerminatable = 5000
    this.isTemporaryUnavailable = true

    setTimeout(() => {
      this.isTemporaryUnavailable = false  
    }, amountOfTimeForScalingManagerToMarkNodeAsTerminatable)
  }

  addServer(data) {
    let server = new Server(this, data)
    this.servers[server.getHost()] = server

    this.region.removeDisconnectedServer(this.name, server)

    FirebaseAdminHelper.registerServerToNode(this.region.name, this.name, server.getFirebaseServerKey())

    return server
  }

  removeServerByHost(host) {
    let server = this.servers[host]

    if (server) {
      FirebaseAdminHelper.removeServerFromNode(this.region.name, this.name, server.getFirebaseServerKey())
      FirebaseAdminHelper.removeServer(this.region.name, server.getFirebaseServerKey())
      server.remove()
    }

    if (this.getServerCount() === 0) {
      this.remove()
    }
  }

  getServerCount() {
    return Object.keys(this.servers).length
  }

  getServer(host) {
    return this.servers[host]
  }

  forEachServer(cb) {
    for (let serverKey in this.servers) {
      cb(this.servers[serverKey])
    }
  }

  getPlayerCount() {
    let result = 0
    
    this.forEachServer((server) => {
      result += server.getPlayerCount()
    })

    return result
  }

  getCapacity() {
    let result = 0
    
    this.forEachServer((server) => {
      result += server.getCapacity()
    })

    return result
  }

  getEmptyServer() {
    if (this.isMarkedForRemoval) return null

    let result

    for (let serverKey in this.servers) {
      let server = this.servers[serverKey]
      if (server.getSectorCount() === 0 &&
          !server.isTemporaryUnavailable()) {
        result = server
        break
      }
    }

    return result
  }

  getAvailableServer(options = {}) {
    if (this.isMarkedForRemoval) return null

    // schedule minigames on minigame nodes only
    if (!debugMode && env !== 'staging') {
      if (!options.isMiniGame && this.isMiniGame()) return null
      if (options.isMiniGame && !this.isMiniGame()) return null
    }
      
    let result

    for (let serverKey in this.servers) {
      let server = this.servers[serverKey]
      if (server.isAvailable(options.isTutorial)) {
        result = server
        break
      }
    }    

    return result
  }

  getSectorCount(isTutorial) {
    let count = 0

    for (let serverKey in this.servers) {
      let server = this.servers[serverKey]
      count += server.getSectorCount()
    }    

    return count
  }

  markForRemoval() {
    this.isMarkedForRemoval = true
  }

  remove() {
    delete this.region.nodes[this.name]

    if (this.nodeRevisionRef) {
      this.nodeRevisionRef.off()
    }
  }

  setPvPServerMissing() {
    if (!this.isMissingPvPTimestamp) {
      this.isMissingPvPTimestamp = Date.now()
    }
  }

  isMiniGame() {
    if (debugMode) return true
    if (env === 'staging') return true
      
    return this.name.split("-")[0] === "mini"    
  }

  getPvPPlayerCapacity() {
    let capacity = 0

    this.forEachServer((server) => {
      if (server.isPvP()) {
        capacity += server.getPvPPlayerCapacity()
      }
    })

    return capacity
  }

  getPvPPlayerCount() {
    let count = 0

    this.forEachServer((server) => {
      if (server.isPvP()) {
        count += server.getPlayerCount()
      }
    })

    return count
  }

  isPvPAlmostFull() {
    let pvpPlayerCount = this.getPvPPlayerCount()
    let pvpPlayerCapacity = this.getPvPPlayerCapacity() 
    let threshold = pvpPlayerCapacity <= 200 ? 0.8 : 0.9
    return (pvpPlayerCount / pvpPlayerCapacity) > threshold
  }

  // wait until servers reconnect to matchmaker before deciding to create pvp server
  // in case of disconnection
  shouldCreatePvPThresholdExceeded() {
    let seconds = debugMode ? 5 : 60
    return (Date.now() - this.isMissingPvPTimestamp) > (1000 * seconds)
  }

  removePvPCreateProgressOnFailure() {
    let exceededOneMinute = (Date.now() - this.createPvPTimestamp) > (1000 * 60)
    if (exceededOneMinute) {
      // pvp server create should not take more than that
      this.isCreatingPvPServer = false
    }
  }

  bootPvPSector(uid) {
    let server = this.getEmptyServer()
    if (!server) return

    LOG.info(this.region.name + " PvP sector " + uid + " disconnected. booting at " + server.host)

    let gameParams = {
      sectorId: uid,
      isBootSector: true,
      gameMode: 'pvp'
    }

    let gameServerSocket = this.region.matchmaker.gameServerSockets[server.host]
    this.matchmaker.socketUtil.emit(gameServerSocket, "CreateGame", gameParams)
  }

  async createPvPServer() {
    this.isMissingPvPTimestamp = null
    this.isCreatingPvPServer = true
    this.createPvPTimestamp = Date.now()

    let server = this.getEmptyServer()
    if (!server) return

    let sectorData = {
      name: "PvP Zone",
      gameMode: 'pvp'
    }

    let sectorModel = await SectorModel.createOne(sectorData)

    let gameParams = {
      sectorId: sectorModel.uid,
      gameMode: 'pvp'
    }

    LOG.info("Node creating pvp server " + sectorModel.uid)

    let gameServerSocket = this.region.matchmaker.gameServerSockets[server.host]
    this.matchmaker.socketUtil.emit(gameServerSocket, "CreateGame", gameParams)
  }

  async onPvPServerCreated(data) {
    this.isCreatingPvPServer = false

    if (!data.success) {
      if (data.isBootSector) {
        ExceptionReporter.captureException(new Error("Failed to boot PvP Sector " + data.sectorId + " at region: " + this.region.name))
      } else {
        let sectorModel = await SectorModel.findOne({ 
          where: { uid: data.sectorId }
        })
        
        if (sectorModel) {
          await sectorModel.destroy()
        }
      }
    }
  }

  hasPvPServer() {
    let result = false

    for (let serverKey in this.servers) {
      let server = this.servers[serverKey]
      if (server.isPvP()) {
        result = true
        break
      }
    }

    return result
  }
}

module.exports = Node
