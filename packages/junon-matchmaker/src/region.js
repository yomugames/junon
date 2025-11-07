const Sector = require('./sector')
const Server = require('./server')
const Node = require('./node')
const FirebaseAdminHelper = require("./firebase_admin_helper")
const ExceptionReporter = require("junon-common/exception_reporter")
const LOG = require('junon-common/logger')

class Region {
  constructor(environment, name) {
    this.environment = environment
    this.matchmaker = environment.matchmaker
    this.name = name

    this.nodes = {}
    this.rebootCount = {}

    this.sectorsCreatedByIp = {}
    this.sectorsCreatedByPlayerUid = {}

    this.playerSessions = {}
    this.disconnectedServers = {}

    this.sockets = {}

    this.chatHistory = []

  }

  incrementRebootCount(uid) {
    this.rebootCount[uid] = this.rebootCount[uid] || 0
    this.rebootCount[uid] += 1
  }

  getRebootCount(uid) {
    return this.rebootCount[uid] || 0
  }

  hasExistingPlayerSession(uid) {
    return this.playerSessions[uid]
  }

  addPlayerSession(uid) {
    this.playerSessions[uid] = uid
  }

  removePlayerSession(uid) {
    delete this.playerSessions[uid]
  }

  getExistingSector(sectorId) {
    let result = null

    for (let nodeName in this.nodes) {
      let node = this.nodes[nodeName]
      for (let host in node.servers) {
        let server = node.servers[host]
        if (server.sectors[sectorId]) {
          result = server.sectors[sectorId]
          break
        }
      }
    }

    return result
  }

  getNode(nodeName) {
    return this.nodes[nodeName]
  }

  getNodeCount() {
    return Object.keys(this.nodes).length
  }

  findBusiestAvailableNode(options = {}) {
    let nodes = Object.values(this.nodes).sort((a, b) => {
      let bScore = b.getPriorityScore(options.isTutorial) 
      let aScore = a.getPriorityScore(options.isTutorial)
      return bScore - aScore 
    }).filter((node) => {
      return !node.isTemporaryUnavailable &&
             !node.isShutdownRequested && 
             node.getAvailableServer(options)
    })

    return nodes[0]
  }

  getPendingSectorForRequestId(sectorId, requestId) {
    let result = null

    for (let nodeName in this.nodes) {
      let node = this.nodes[nodeName]
      for (let host in node.servers) {
        let server = node.servers[host]
        let pendingSector = server.getPendingSectorForRequestId(sectorId, requestId)
        if (pendingSector) {
          result = pendingSector
          break
        }
      }
    }

    return result
  }

  getJoinablePendingSector(sectorId, options = {}) {
    let result = null

    for (let nodeName in this.nodes) {
      let node = this.nodes[nodeName]
      for (let host in node.servers) {
        let server = node.servers[host]
        let pendingSector = server.getJoinablePendingSector(sectorId, options)
        if (pendingSector) {
          result = pendingSector
          break
        }
      }
    }

    return result
  }

  getJoinableMiniGame(sectorId, options) {
    let result = null
    for (let nodeName in this.nodes) {
      let node = this.nodes[nodeName]
      for (let host in node.servers) {
        let server = node.servers[host]
        let sector = server.getMiniGame(sectorId, options)
        if (sector) {
          result = sector
          break
        }
      }
    }

    return result
  }

  getAvailableMiniGameServer() {
    let node = this.findBusiestAvailableNode({ isMiniGame: true })
    if (!node) return null

    return node.getAvailableServer({ isMiniGame: true })
  }

  getServerByHost(targetHost) {
    let result

    for (let nodeName in this.nodes) {
      let node = this.nodes[nodeName]

      for (let host in node.servers) {
        if (host === targetHost) {
          result = node.servers[host]
          break
        }
      }
    }

    return result
  }

  findBusiestAvailableNodeForPvP() {
    let nodes = Object.values(this.nodes).sort((a, b) => {
      let bScore = b.getPriorityScore() 
      let aScore = a.getPriorityScore()
      return bScore - aScore 
    }).filter((node) => {
      return !node.isTemporaryUnavailable &&
             !node.isShutdownRequested && 
             !node.isMiniGame() &&
             node.getEmptyServer()
    })

    return nodes[0]
  }

  getName() {
    return this.name
  }

  addNode(nodeName) {
    let node = new Node(this, nodeName)
    this.nodes[nodeName] = node
    this.onNodeCountChanged()
    return node
  }

  removeNode(nodeName) {
    let node = this.nodes[nodeName]
    if (node) {
      node.remove()
    }
    this.onNodeCountChanged()
  }

  onNodeCountChanged() {
    if (global.isOffline) return
    FirebaseAdminHelper.setRegionNodeCount(this.name, this.getNodeCount())
  }

  addSocket(socket) {
    this.sockets[socket.id] = socket
  }

  removeSocket(socket) {
    delete this.sockets[socket.id] 
  }

  getSocketIds() {
    return Object.keys(this.sockets)
  }

  getOneServerJson() {
    let data = {}
    let nodeName = Object.keys(this.nodes)[0]
    let node = this.nodes[nodeName]
    if (!node) return data

    let host = Object.keys(node.servers)[0]
    let server = node.servers[host]
    if (!server) return data

    data[server.host] = true

    return data
  }  

  getServersJson() {
    let servers = {}

    for (let nodeName in this.nodes) {
      let node = this.nodes[nodeName]

      for (let host in node.servers) {
        let server = node.servers[host]
        servers[server.host] = { playerCount: server.getPlayerCount() }
      }
    }

    return servers
  }

  getSectorsJson() {
    let json = {}

    this.forEachNode((node) => {
      node.forEachServer((server) => {
        Object.assign(json, json, server.getSectorsJson())
      })
    })

    return json
  }

  addDisconnectedServer(nodeName, server) {
    try {
      this.disconnectedServers[nodeName] = this.disconnectedServers[nodeName] || {}
      this.disconnectedServers[nodeName][server.host] = { 
        server: server, 
        disconnectedAt: Date.now() 
      } 
    } catch(e) {
      ExceptionReporter.captureException(e)
    }
  }

  removeDisconnectedServer(nodeName, server) {
    try {
      this.disconnectedServers[nodeName] = this.disconnectedServers[nodeName] || {}

      delete this.disconnectedServers[nodeName][server.host]

      if (Object.keys(this.disconnectedServers[nodeName]).length === 0) {
        delete this.disconnectedServers[nodeName]
      }
    } catch(e) {
      ExceptionReporter.captureException(e)
    }
  }

  extractCrashedServers() {
    let crashedServers = {}

    let crashDurationThreshold = debugMode ? (1000 * 5) : (1000 * 20)

    for (let nodeName in this.disconnectedServers) {
      let disconnections = this.disconnectedServers[nodeName]
      for (let host in disconnections) {
        let data = disconnections[host]
        let disconnectDuration = Date.now() - data.disconnectedAt
        if (disconnectDuration > crashDurationThreshold) {
          crashedServers[nodeName] = crashedServers[nodeName] || {}
          crashedServers[nodeName][host] = data
          this.removeDisconnectedServer(nodeName, data.server)
        }
      }
    }

    return crashedServers
  }


  forEachNode(cb) {
    for (let nodeName in this.nodes) {
      cb(this.nodes[nodeName])
    }
  }

  getActivePlayerCreatedGame(ip, uid) {
    if (uid) {
      if (this.sectorsCreatedByPlayerUid[uid]) {
        return this.sectorsCreatedByPlayerUid[uid]
      }
    }

    if (this.sectorsCreatedByIp[ip]) {
      return this.sectorsCreatedByIp[ip]
    }

    return null
  }

  registerPlayerCreateGame(data) {
    if (data.creatorIp) {
      this.sectorsCreatedByIp[data.creatorIp] = data
    }

    if (data.creatorUid) {
      this.sectorsCreatedByPlayerUid[data.creatorUid] = data
    }
  }

  onGlobalClientChat(data) {
    let chatMessage = { username: data.username, message: data.message, uid: data.uid }
    this.chatHistory.push(chatMessage)

    if (this.chatHistory.length > 100) {
      this.chatHistory.shift()
    }

    this.broadcastMessage(chatMessage)
  }

  sendChatHistory(socket) {
    this.matchmaker.socketUtil.emit(socket, "ChatHistory", this.chatHistory)
  }

  broadcastMessage(chatMessage) {
    for (let socketId in this.sockets) {
      let socket = this.sockets[socketId]

      this.matchmaker.socketUtil.emit(socket, "ServerChat", chatMessage)
    }    
  }

  unregisterPlayerCreateGame(data) {
    if (data.creatorIp) {
      delete this.sectorsCreatedByIp[data.creatorIp] 
    }

    if (data.creatorUid) {
      delete this.sectorsCreatedByPlayerUid[data.creatorUid] 
    }
  }

  getPlayerCount() {
    let result = 0

    this.forEachNode((node) => {
      result += node.getPlayerCount()
    })

    return result
  }

  isSectorPresent(uid) {
    let result = false

    for (let nodeName in this.nodes) {
      let node = this.nodes[nodeName]
      for (let serverKey in node.servers) {
        let server = node.servers[serverKey]
        if (server.getSector(uid)) {
          result = true  
          break
        }
      }
    }

    return result
  }

  getSectorCount() {
    let result = 0

    this.forEachNode((node) => {
      result += node.getSectorCount()
    })

    return result
  }

  getCapacity() {
    let result = 0

    this.forEachNode((node) => {
      result += node.getCapacity()
    })

    return result
  }

  onPlayerCountChanged(sector) {
    this.matchmaker.onPlayerCountChanged(sector)
    this.scaleNodes()
  }

  scaleNodes() {
    return
    let isServerRecentlyBooted = Date.now() - server.bootTime < (2 * 60 * 1000)
    if (isServerRecentlyBooted) {
      // gameServers havent connected to it yet, we dont know actual capacity..
      return
    }
    
    let capacity = this.getCapacity()
    let sectorCount = this.getSectorCount()

    let usagePercent = capacity === 0 ? 1 : sectorCount / capacity
    if (usagePercent > SCALE_UP_REQUIRED_USAGE_THRESHOLD) {
      // can only scale every 15 minutes
      if (this.isAllowedToScaleUp()) {
        this.scaleUp(sectorCount, capacity)
      }
    } else if (usagePercent < SCALE_DOWN_USAGE_THRESHOLD) {
      if (this.isAllowedToScaleDown()) {
        this.scaleDown(sectorCount, capacity)
      }
    }
  }

  isAllowedToScaleUp() {
    if (!this.lastScaleTime) return true
    return (Date.now() - this.lastScaleTime) > SCALE_UP_INTERVAL
  }

  isAllowedToScaleDown() {
    if (!this.lastScaleTime) return true
    return (Date.now() - this.lastScaleTime) > SCALE_UP_INTERVAL
  }

  getFullNodeCapacity() {
    return SERVER_COUNT_PER_NODE * MAX_SECTORS_PER_SERVER 
  }

  scaleUp(sectorCount, capacity) {
    if (global.dontScale) return

    let additionalCapacity = this.getFullNodeCapacity()
    let normalizedSectorCount = sectorCount === 0 ? 1 : sectorCount
    let additionalNodeNeeded 
    if (capacity === 0) {
      // no servers
      additionalNodeNeeded = 1
    } else {
      additionalNodeNeeded = Math.abs(Math.ceil((normalizedSectorCount/SCALE_UP_REQUIRED_USAGE_THRESHOLD - capacity) / additionalCapacity))
    }

    LOG.info(`[scaleUp][${this.name}] additionalNodeNeeded: ${additionalNodeNeeded} sectorCount: ${sectorCount} capacity: ${capacity}`)
    
    FirebaseAdminHelper.setAdditionalNodeNeeded(this.name, additionalNodeNeeded)
    this.lastScaleTime = Date.now()
  }

  scaleDown(sectorCount, capacity) {
    if (this.getNodeCount() === 1) return // always leave 1 node running

    let normalizedSectorCount = sectorCount === 0 ? 1 : sectorCount
    let additionalCapacity = this.getFullNodeCapacity()
    let disposableNodeCount = Math.floor((capacity - normalizedSectorCount / SCALE_UP_REQUIRED_USAGE_THRESHOLD) / additionalCapacity)

    let nodesToShutdown = {}

    this.forEachNode((node) => {
      if (node.canBeShutdown() && disposableNodeCount > 0) {
        node.markForRemoval()
        nodesToShutdown[node.name] = true
        disposableNodeCount -= 1
      }
    })

    for (let nodeName in nodesToShutdown) {
      LOG.info(`[scaleDown][${this.name}] setNodeToShutdown: ${nodeName}`)
      FirebaseAdminHelper.setNodeToShutdown(this.name, nodeName)
    }

  }
}

module.exports = Region