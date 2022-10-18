const Constants = require('../../common/constants.json')
const SAT = require('sat')
const LOG = require('junon-common/logger')
const ExceptionReporter = require('junon-common/exception_reporter')
const Helper = require('../../common/helper')
const p2 = require('p2')
const fs = require("fs")
const vec2 = p2.vec2
const AABB = p2.AABB
const rbush = require("rbush")
const base64id = require('base64id')
const EventBus = require('eventbusjs')
const Projectiles = require("./projectiles/index")
const Buildings = require("./buildings/index")
const Mobs = require("./mobs/index")
const Player = require("./player")
const Lobby = require("./lobby")
const SurvivalSector = require("./survival_sector")
const Sector = require("./sector")
const Item = require("./item")
const Team = require("./team")
const EventManager = require('./event_manager')
const Faker = require('faker')
const BadWordsFilter = require("../util/bad_words_filter")
const IDGenerator = require('../util/id_generator')
const WorldSerializer = require("junon-common/world_serializer")
const ObjectPool = require("../../common/entities/object_pool")
const TileHit = require("./tile_hit")
const FirebaseAdminHelper = require("../util/firebase_admin_helper")
const Sentry = require('@sentry/node')
const AWS = require('aws-sdk')
const bucketName = "junon"
const User = require("junon-common/db/user")
const SectorModel = require("junon-common/db/sector")
const Protocol = require("../../common/util/protocol")
const zlib = require("zlib")
const Kit = require("./kit")
const Scene = require("./scene")
const Commands = require("../commands/index")
const Sidebar = require("./sidebar")
const xss = require("xss")

class Game {
  constructor(server, sectorData = {}) {
    this.server = server
    this.gameStartTime = Date.now()

    if (!sectorData.id) {
      let sectorIdAndName = this.generateSectorIdName()
      this.sectorUid  = this.id   = sectorIdAndName.id
      this.sectorName = this.name = sectorIdAndName.name
    } else {
      this.origSectorUid = sectorData.origSectorUid
      this.sectorUid  = this.id   = sectorData.id

      let sectorName
      if (sectorData.name) {
        sectorName = this.replaceBadWords(sectorData.name).replace(/\*/g, "")
      }

      this.sectorName = this.name = sectorName || `Sector ${this.sectorUid}`

      if (sectorData.name) {
        this.isCustomNameProvided = true
      }
    }

    if (sectorData.sectorModel) {
      this.sectorModel = sectorData.sectorModel
    }

    Sentry.configureScope(scope => {
      scope.setExtra('sectorUid', this.sectorUid)
      scope.setExtra('host', this.server.getHost())
    })

    this.isTutorial = sectorData.isTutorial

    this.idGenerator = new IDGenerator()

    this.playerIdMap = {}
    this.playerDataMap = {}
    this.kits = {}
    this.scenes = {}
    this.dialogueMap = {}
    this.needs = {}
    this.commandQueue = []

    this.pendingMatchmakerChecks = {}
    this.disconnectedPlayers = {}
    this.teams = {}
    this.colonies = {}
    this.players = {}
    this.entities = {}
    this.reservedSpots = {}
    this.leavingPlayers = {}
    this.sessionResumptionRequests = {}
    this.commands = {}
    this.timers = {}
    this.sidebars = {}

    this.gameInfo = {} // to be sent to gamestate msg
    this.characterRestarts = {}

    this.leaderboard = []
    this.leaderboardChanged = false
    this.TREE_SPAWN_PERCENTAGE = 1
    this.tickHighCount = 0
    this.memoryHighCount = 0
    this.leavingPlayerCount = 0

    this.populationLabel = "empty"

    this.createGlobalSidebar()

    this.setPhysicsStep(this.server.PHYSICS_TIMESTEP / 1000)
    global.dg = this
  }

  setCreatorUid(uid) {
    this.creatorUid = uid
  }

  addCharacterRestart(player) {
    this.characterRestarts[player.getUid()] = this.timestamp
  }

  hasKit(name) {
    return !!this.getKit(name)
  }

  getKit(name) {
    return this.kits[name]
  }

  getKitCount() {
    return Object.keys(this.kits).length
  }

  createKit(name, options = {}) {
    if (this.getKitCount() >= 20) return

    let kit = new Kit(this, name)

    if (options.kitData) {
      return kit.createFromKitData(options.kitData)
    } else if (options.inventory) {
      return kit.createFromInventory(options.inventory)
    }
  }

  deleteKit(name) {
    let kit = this.kits[name]
    if (!kit) return

    kit.remove()
    return true
  }

  renameKit(name, newName) {
    let kit = this.kits[name]
    if (!kit) return

    return kit.rename(newName)
  }

  createSidebar(player) {
    this.sidebars[player.getId()] = new Sidebar(player)
  }

  createGlobalSidebar() {
    this.globalSidebar = new Sidebar(null, { game: this })
    this.sidebars[0] = this.globalSidebar
  }

  removeSidebar(player) {
    delete this.sidebars[player.getId()]
  }

  clearSidebar(playerId) {
    if (!this.sidebars[playerId]) return
    this.sidebars[playerId].clear()
  }

  showSidebar(playerId) {
    if (!this.sidebars[playerId]) return
    this.sidebars[playerId].setIsVisible(true)
  }

  hideSidebar(playerId) {
    if (!this.sidebars[playerId]) return
    this.sidebars[playerId].setIsVisible(false)
  }

  setSidebarText(playerId, options = {}) {
    if (!this.sidebars[playerId]) return
    this.sidebars[playerId].setSidebarText(options)
  }

  enableGlobalScoreboard(row, options = {}) {
    this.globalSidebar.enableScoreboard(row, options)
  }

  hideGlobalScoreboard(row) {
    this.globalSidebar.hideScoreboard()
  }

  giveKit(name, player) {
    let kit = this.kits[name]
    if (!kit) return

    kit.giveToPlayer(player)
  }

  giveKitToRole(name, role) {
    let kit = this.kits[name]
    if (!kit) return

    role.setKitName(kit.name)
  }

  createScene(name, options = {}) {
    let scene = new Scene(this, name)
    return scene
  }

  hasScene(name) {
    return this.scenes[name]
  }

  playScene(name, options = {}) {
    let scene = this.scenes[name]
    if (!scene) return

    scene.play(options)
  }

  deleteScene(name) {
    let scene = this.scenes[name]
    if (!scene) return

    scene.remove()
    return true
  }

  executeCommand(caller, message, delay = 0) {
    message = message.substr(1) // remove / character

    // remove spaces inside brackets
    // https://stackoverflow.com/a/16644618
    message = message.replace(/\s+(?=[^[\]]*\])/g, "")
    const tokens = message.split(/\s+/)
    const commandName = tokens.shift()
    const args = tokens.filter((token) => { return token.length > 0 })
    const command = this.commands[commandName]
    if (!command) return

    if (delay > 0 && command.isDelayable()) {
      let timestampDelay = delay * Constants.physicsTimeStep
      let futureTimestamp = this.timestamp + timestampDelay
      this.commandQueue[futureTimestamp] = this.commandQueue[futureTimestamp] || []
      this.commandQueue[futureTimestamp].push({
        commandName: commandName,
        caller: caller,
        args: args,
        message: message,
      })
    } else {
      command.execute(caller, args, message)
    }
  }

  processCommandQueue() {
    let queue = this.commandQueue[this.timestamp]
    if (queue) {
      queue.forEach((data) => {
        let command = this.commands[data.commandName]
        if (command) {
          command.execute(data.caller, data.args, data.message)
        }
      })
    }

    delete this.commandQueue[this.timestamp]
  }


  renameScene(name, newName) {
    let scene = this.scenes[name]
    if (!scene) return

    return scene.rename(newName)
  }

  captureException(e) {
    Sentry.withScope((scope) => {
      scope.setExtra('sectorUid', this.sectorUid)
      ExceptionReporter.captureException(e)
    })
  }

  generateId(type) {
    return this.idGenerator.generate(type)
  }

  static getS3() {
    if (!this.s3) {
      const spacesEndpoint = new AWS.Endpoint('nyc3.digitaloceanspaces.com')
      this.s3 = new AWS.S3({
        endpoint: spacesEndpoint
      })
    }

    return this.s3
  }

  getS3() {
    return this.constructor.getS3()
  }

  async uploadImage(key, data, options = {}) {
    if (debugMode) {
      return this.uploadImageLocally(key, data)
    } else {
      return this.uploadImageRemotely(key, data)
    }
  }

  async uploadImageLocally(key, data) {
    try {
      let filePath = global.appRoot + "/client/assets/screenshots/" + key
      fs.writeFileSync(filePath, data)
      return true
    } catch(e) {
      this.captureException(e)
      return false
    }
  }

  async deleteImageLocally(key) {
    try {
      let filePath = global.appRoot + "/client/assets/screenshots/" + key
      if (!fs.existsSync(filePath)) {
        return false
      }

      fs.unlinkSync(filePath)
      return true
    } catch(e) {
      this.captureException(e)
      return false
    }
  }

  async uploadImageRemotely(key, data) {
    const params = {
      Body: data,
      Bucket: bucketName,
      Key: key,
      ACL: 'public-read',
      ContentType: 'image/jpeg'
    }

    return new Promise((resolve, reject) => {
      this.getS3().putObject(params, (err, data) => {
        if (err) {
          this.captureException(err)
          resolve(false)
        } else {
          resolve(true)
        }
      })
    })
  }

  async deleteImage(key) {
    if (debugMode) {
      return this.deleteImageLocally(key)
    } else {
      return this.deleteImageRemotely(key)
    }
  }

  deleteImageRemotely(key) {
    const params = {
      Bucket: bucketName,
      Key: key
    }

    return new Promise((resolve, reject) => {
      this.getS3().deleteObject(params, (err, data) => {
        if (err) {
          this.captureException(err)
          resolve(false)
        } else {
          resolve(true)
        }
      })
    })
  }

  setCreatorIp(creatorIp) {
    this.creatorIp = creatorIp
  }

  getCreatorIp() {
    return this.creatorIp
  }

  setCreatorSessionId(sessionId) {
    this.creatorSessionId = sessionId
  }

  getCreatorSessionId() {
    return this.creatorSessionId
  }

  getCreator() {
    let result

    for (let id in this.players) {
      let player = this.players[id]
      if (player.uid === this.getCreatorUid()) {
        result = player
        break
      }
    }

    return result
  }

  getCreatorUid() {
    return this.creatorUid
  }

  generateSectorIdName() {
    let randomNumber =  Math.random().toString().slice(2)
    return {
      id: base64id.generateId(),
      name: "Sector " + randomNumber
    }
  }

  isATMDisabled() {
    return this.isHardcore() || this.isPeaceful()
  }

  getId() {
    return this.id
  }

  async init(options = {}) {
    this.initEventManager()
    this.initWorld()
    this.gameMode = options.gameMode

    this.language = options.language || "en"

    this._isMiniGame = options.isMiniGame

    await this.initSector(options)

    this.initCommands()
  }

  isMiniGame() {
    return this._isMiniGame
  }

  getObjectivesBySelector(selector) {
    if (selector[0] === "@") {
      if (selector === "@all") {
        return Object.values(this.sector.objectives).filter((objective) => {
          return !objective.isAssigned()
        })
      }
      if (selector === "@rand") {
        let list = Object.values(this.sector.objectives).filter((objective) => {
          return !objective.isAssigned()
        })
        let index = Math.floor(Math.random() * list.length)
        return [list[index]]
      }
      return []
    } else {
      let objective = this.sector.objectives[selector]
      if (!objective) return []
      return [objective]
    }
  }

  getWorldSerializer() {
    return WorldSerializer
  }

  onGameReady(cb) {
    if (this.isGameReady) {
      cb()
    } else {
      this.gameReadyCallback = cb
    }
  }

  sanitize(text) {
    text = xss(text)
    return text.replace(/(<([^>]+)>)/ig, '')
  }

  replaceBadWords(message) {
    if (Helper.isJapaneseText(message)) {
      message = BadWordsFilter.replaceBadWordsJapanese(message)
    }

    message = BadWordsFilter.replaceBadWordsEnglish(message)

    return message
  }

  postGameReady() {
    this.initScenes()

    this.readyTime = Date.now()
    this.isGameReady = true
    this.sendSectorInfoToMatchmaker()

    this.triggerEvent("GameStart")
    this.triggerEvent("WorldLoaded")

    if (this.gameReadyCallback) {
      this.gameReadyCallback()
      this.gameReadyCallback = null
    }

    if (this.isPvP()) {
      FirebaseAdminHelper.setPvPSector(this.sector.uid)
    }
  }

  sendServerRestartCountdown(reason, seconds) {
    this.forceRestart = true
    this.serverRestartTimestamp = this.timestamp + (Constants.physicsTimeStep * seconds)
    this.restartReason = reason
    this.getSocketUtil().broadcast(this.getSocketIds(), "ServerRestartCountdown", {
      timestamp: this.serverRestartTimestamp,
      reason: reason
    })
  }

  getSocketUtil() {
    return this.server.socketUtil
  }

  generateName() {
    if (!this.nameGenerator) {
      this.nameGenerator = Faker
    }

    let name = this.nameGenerator.name.firstName()

    if (this.isUsernameTakenInServer(name)) {
      return this.generateName()
    } else {
      return name
    }
  }

  getNeeds() {
    return this.needs
  }

  removeNeed(entityId) {
    delete this.needs[entityId]
  }

  assignNeed(entityId, type) {
    this.needs[entityId] = type
  }

  getDialogueList() {
    return Object.values(this.dialogueMap)
  }

  removeDialogue(entityId) {
    delete this.dialogueMap[entityId]
  }

  assignDialogue(entityId, text, options = {}) {
    entityId = parseInt(entityId)
    let locale = options.locale || "en"
    this.dialogueMap[entityId] = this.dialogueMap[entityId] || { dialogues: {} }
    this.dialogueMap[entityId].dialogues[locale] = text || ""

    this.forEachPlayer((player) => {
      this.getSocketUtil().emit(player.getSocket(), "DialogueUpdated", {
        dialogueMap: this.dialogueMap
      })
    })
  }

  async generateUniqueUsername() {
    if (!this.nameGenerator) {
      this.nameGenerator = Faker
    }

    let name = this.nameGenerator.name.firstName()

    let isUsernameTaken = await User.isUsernameTaken(name)
    let isUsernameTakenInServer = this.isUsernameTakenInServer(name)
    let isBadWord = BadWordsFilter.isBadWord(name)
    if (isUsernameTaken || isUsernameTakenInServer || isBadWord) {
      return this.generateUniqueUsername()
    } else {
      return name
    }
  }

  reserveSpot(ip) {
    if (this.isGameFull()) return false

    this.reservedSpots[ip] = { ip: ip, timestamp: Date.now() }

    return true
  }

  hasReservedSpot(ip) {
    return this.reservedSpots[ip]
  }

  initEventManager() {
    this.eventManager = new EventManager(this)
  }

  getJoinableTeams() {
    return Object.values(this.teams).filter((team) => {
      return team.isJoinable()
    })
  }

  forEachTeam(cb) {
    for (let id in this.teams) {
      cb(this.teams[id])
    }
  }

  getJoinableTeamsJson() {
    return this.getJoinableTeams().map((team) => {
      return team.getTeamData()
    })
  }

  createRaidEvent(options) {
    this.eventManager.createRaid(options.player.getTeam())
  }


  removeReservedSpot(ip) {
    delete this.reservedSpots[ip]
  }

  isGameFull() {
    let totalCount = this.getNumPlayers() + this.getNumReservedSpots()
    return totalCount >= 5
  }

  getNumReservedSpots() {
    return Object.keys(this.reservedSpots).length
  }

  addDisconnectedPlayer(player) {
    this.disconnectedPlayers[player.id] = player
  }

  cleanupLeavingPlayers() {
    if (this.leavingPlayerCount > 0)

    for (let id in this.leavingPlayers) {
      let leaveTimestamp = this.leavingPlayers[id]
      let duration = this.timestamp - leaveTimestamp
      if (duration > (Constants.physicsTimeStep * 5)) {
        let player = this.players[id]
        this.removeLeavingPlayer(player)
        player.remove()
      }
    }
  }

  cleanupCharacterRestarts() {
    if (!this.isPvP()) return

    const isOneMinuteInterval = this.timestamp % (Constants.physicsTimeStep * 60) === 0
    if (!isOneMinuteInterval) return

    for (let uid in this.characterRestarts) {
      let timestamp = this.characterRestarts[uid]
      let duration = this.timestamp - timestamp
      let fiveMinutes = Constants.physicsTimeStep * 60 * 5
      if (duration > fiveMinutes) {
        delete this.characterRestarts[uid]
      }
    }
  }

  cleanupPlayerDataMap() {
    // !!!IMPORTANT, only on PVP do we want to cleanup playerDataMap
    // in co-op they should be permanent since they hold admin playerData, ownership, etc.
    if (!this.isPvP()) return

    const isOneMinuteInterval = this.timestamp % (Constants.physicsTimeStep * 60) === 0
    if (!isOneMinuteInterval) return

    for (let id in this.playerDataMap) {
      let playerData = this.playerDataMap[id]
      let aliveDuration = this.timestamp - playerData.createTimestamp
      let oneDay = Constants.physicsTimeStep * 60 * 60 * 24
      let shouldExpire = aliveDuration > oneDay
      if (shouldExpire) {
        playerData.removeOwnerships()
        playerData.remove()
      }
    }
  }

  cleanupReservedSpots() {
    const isOneSecondInterval = this.timestamp % Constants.physicsTimeStep === 0
    if (!isOneSecondInterval) return

    try {
      for (let ip in this.reservedSpots) {
        let spot = this.reservedSpots[ip]
        let isSpotExpired = Date.now() - spot.timestamp > 5000
        if (isSpotExpired) {
          delete this.reservedSpots[ip]
        }
      }
    } catch(e) {
      this.captureException(e)
    }
  }

  cleanupPlayers() {
    const isOneSecondInterval = this.timestamp % Constants.physicsTimeStep === 0
    if (!isOneSecondInterval) return

    const numSecondsAllowDisconnected = 15

    for (let playerId in this.disconnectedPlayers) {
      try {
        let player = this.disconnectedPlayers[playerId]
        player.increaseDisconnection()

        if (player.disconnection >= numSecondsAllowDisconnected) {
          player.remove()
          delete this.disconnectedPlayers[playerId]
        }
      } catch(e) {
        this.captureException(e)
      }
    }
  }

  onPlayerReconnected(player, oldSocketId) {
    LOG.info(player.name + " reconnected ")

    delete this.leavingPlayers[player.id]
    player.resetDisconnection()
    delete this.disconnectedPlayers[player.id]

    // register new socket id
    delete this.playerIdMap[oldSocketId]
    this.playerIdMap[player.getSocketId()] = player.id
  }

  createTeam(teamName) {
    let team = new Team(this.sector, { name: teamName, joinable: true })
    return team
  }

  joinTeam(teamName, player) {
    let team = this.getTeamByName(teamName)
    if (!team) return false

    if (player.isRemoved) return

    // only remove if different team to avoid triggering unwanted team leave event
    if (player.team?.name !== teamName) {
      player.removeTeamMemberships()
    }
    
    team.addMemberWithRole(player)

    return true
  }

  getTeamByName(teamName) {
    let result

    for (let id in this.teams) {
      let team = this.teams[id]
      if (team.isSectorOwner() && teamName === 'owner') {
        result = team
        break
      } else if (team.name.toLowerCase() === teamName.toLowerCase()) {
        result = team
        break
      }
    }

    return result
  }

  generateEntityId() {
    let found = false
    let id

    while (!found) {
      id = this.idGenerator.generate("entity")
      if (!this.entityIdExists(id)) {
        found = true
      }
    }

    return id
  }

  entityIdExists(id) {
    return this.getEntity(id)
  }

  getEntity(id) {
    return this.entities[id]
  }

  forEachEntity(cb) {
    for (let id in this.entities) {
      cb(this.entities[id])
    }
  }

  registerEntity(entity) {
    this.entities[entity.id] = entity
  }

  unregisterEntity(entity) {
    let gameEntity = this.entities[entity.id]

    if (gameEntity === entity) {
      delete this.entities[entity.id]
    }
  }


  initWorld() {
    this.gravity = [0, 0]
    this.world = new p2.World({ gravity: this.gravity })
    this.creationTime = (new Date()).getTime()

    this.world.defaultContactMaterial.friction = 0
    this.world.defaultContactMaterial.restitution = 0
    this.world.defaultContactMaterial.stiffness = Number.MAX_VALUE
    this.world.defaultContactMaterial.relaxation = 2
    this.world.solver.iterations = 7
    // this.world.sleepMode = p2.World.BODY_SLEEPING
    // this.world.step = this.platformerWorldStep.bind(this)

    this.timestamp = 0
  }

  initLobby(sectorData) {
    // let blueprintData = this.getLobbyBlueprintData()
    // let saveData = this.convertLobbyBlueprintToSaveData(blueprintData)

    let saveData = {
      metadata: {
        uid: this.sectorUid,
        name: "Tutorial Lobby",
        rowCount: 128,
        colCount: 128,
        timestamp: 0
      },
      entities: {
        buildings: []
      }
    }

    new Lobby(this, sectorData.metadata, sectorData.entities )
  }

  convertLobbyBlueprintToSaveData(blueprintData) {
    let data = {
      metadata: {
        uid: this.sectorUid,
        name: "Tutorial Lobby",
        rowCount: blueprintData.rowCount,
        colCount: blueprintData.colCount,
        timestamp: 0
      },
      entities: {
        buildings: []
      }
    }

    data.entities.buildings = data.entities.buildings.concat(blueprintData.components.platforms)
    data.entities.buildings = data.entities.buildings.concat(blueprintData.components.armors)
    data.entities.buildings = data.entities.buildings.concat(blueprintData.components.structures)
    data.entities.buildings = data.entities.buildings.concat(blueprintData.components.distributions)

    return data
  }

  canBeSaved() {
    if (this.isTutorial) return false
    if (this.isMiniGame()) return false

    return true
  }

  async saveWorld() {
    if (!this.isGameReady) return // dont save incomplete sector state
    if (!this.canBeSaved()) return

    this.isSaving = true

    this.getSocketUtil().broadcast(this.getSocketIds(), "SaveProgress", { finished: false })

    await WorldSerializer.saveSector(this.sector)

    this.isSaving = false
    this.getSocketUtil().broadcast(this.getSocketIds(), "SaveProgress", { finished: true })
  }

  async initSector(options = {}) {
    let gameMode = options.gameMode

    let rowCount = gameMode === 'pvp' ? 512 : options.rowCount
    let colCount = gameMode === 'pvp' ? 512 : options.colCount

    if (env === 'test') {
      this.initSurvivalSector({ rowCount: rowCount, colCount: colCount, uid: this.sectorUid, name: this.sectorName })
      return
    }

    if (this.isTutorial) {
      let compressed = require("fs").readFileSync(global.appRoot + "/common/tutorial.sav.gz")
      let buffer = await this.decompressGzip(compressed)
      if (!buffer) return

      let version = WorldSerializer.parseSaveFileVersion(buffer)
      let sectorData = WorldSerializer.parseSaveGame(buffer, version)
      this.initLobby(sectorData)
      return
    }

    let isNewGame = !options.isBootSector && !options.isMiniGame
    if (false && isNewGame) {
       let compressed = require("fs").readFileSync("/Users/reg/gamedev/junon/sector.sav.gz")
      // let compressed = require("fs").readFileSync("/Users/reg/gamedev/junon/junon-io/amongus_3.sav.gz")
      let buffer = await this.decompressGzip(compressed)
      if (!buffer) return

      let version = WorldSerializer.parseSaveFileVersion(buffer)
      let sectorData = WorldSerializer.parseSaveGame(buffer, version)

      await this.initSurvivalSector(sectorData.metadata, sectorData.entities)

      return
    }

    let uid = this.isMiniGame() ? this.origSectorUid : this.sectorUid

    let hasCloudSavedData = await WorldSerializer.hasCloudSavedData(uid)
    if (!hasCloudSavedData) {
      if (options.isBootSector) {
        console.log("Missing save data for bootable sector " + uid)
        return
      }

      console.log("No save data for sector " + uid + " . Creating new map " + gameMode)
      await this.initSurvivalSector({ rowCount: rowCount, colCount: colCount, uid: uid, name: this.sectorName, gameMode: gameMode })
      return
    }

    console.log("Save data found on s3 bucket: " + WorldSerializer.getSectorSavePath(uid))
    let sectorSaveData = await WorldSerializer.loadSector(uid)
    if (!sectorSaveData) {
      this.captureException(new Error("Error downloading save data."))
      return
    } else {
      console.log("Successfully downloaded save data. Loading entities..")
      await this.initSurvivalSector(sectorSaveData.metadata, sectorSaveData.entities)
    }
  }

  decompressGzip(compressed) {
    return new Promise((resolve, reject) => {
      zlib.gunzip(compressed, (err, result) => {
        if (err) {
          ExceptionReporter.captureException(err)
          resolve(null)
        } else {
          resolve(result)
        }
      })
    })
  }

  isPeaceful() {
    return this.gameMode === 'peaceful'
  }

  isSurvival() {
    return this.gameMode === 'survival'
  }

  isSurvivalOrHardcore() {
    return this.isSurvival() || this.isHardcore()
  }

  addLeavingPlayer(player) {
    this.leavingPlayers[player.getId()] = this.timestamp
    this.leavingPlayerCount = Object.keys(this.leavingPlayers).length
  }

  removeLeavingPlayer(player) {
    delete this.leavingPlayers[player.getId()]
    this.leavingPlayerCount = Object.keys(this.leavingPlayers).length
  }

  getGameMode() {
    return this.gameMode || "default"
  }

  isPvP() {
    return this.gameMode === 'pvp'
  }

  triggerEvent(eventName, params = {}) {
    if (!this.isGameReady) return
    this.sector && this.sector.eventHandler.trigger(eventName, params)
  }

  addTimer(timer) {
    let isTimerRunning = this.timers[timer.name]
    if (isTimerRunning) return

    this.timers[timer.name] = Object.assign({}, timer)
  }

  removeTimer(timer) {
    let isTimerRunning = this.timers[timer.name]
    if (!isTimerRunning) return

    delete this.timers[timer.name]
  }

  hasTimer(name) {
    return this.timers[name]
  }

  runTimers() {
    const isOneSecondInterval = this.timestamp % Constants.physicsTimeStep === 0
    if (!isOneSecondInterval) return

    for (let name in this.timers) {
      let timer = this.timers[name]
      if (!timer.tick) {
        timer.tick = 0
        this.sector.eventHandler.triggerTimerStart(timer)
      }

      timer.tick += 1
      if (timer.every) {
        if (timer.tick % timer.every === 0) {
          this.sector.eventHandler.triggerTimerTick(timer)
        }
      } else {
        this.sector.eventHandler.triggerTimerTick(timer)
      }

      if (timer.duration > 0 && timer.tick === timer.duration) {
        delete this.timers[timer.name]
        this.sector.eventHandler.triggerTimerEnd(timer)
      }
    }
  }

  onRoundStarted() {
    this.sendToMatchmaker({ event: "RoundStarted", data: this.getSectorData() })
    this.forEachPlayer((player) => {
      this.getSocketUtil().emit(player.socket, "RoundStarted", {})
    })
  }

  onRoundEnded() {
    if (!this.isMiniGame()) return

    this.remove()
  }

  isHardcore() {
    return this.gameMode === 'hardcore'
  }

  pause() {
    this.shouldPause = true
  }

  unpause() {
    this.shouldPause = false
  }

  async setGameMode(gameMode) {
    if (this.isMiniGame()) return

    let allowedGameModes = ['peaceful', 'survival', 'hardcore']
    if (allowedGameModes.indexOf(gameMode) === -1) return
    if (this.gameMode === gameMode) return

    if (!this.gameMode || this.gameMode === 'default') {
      await SectorModel.update({
        gameMode: gameMode,
      }, {
        where: { uid: this.getSectorUid() }
      })

      this.gameMode = gameMode
      this.sector.setGameMode(gameMode)

      this.getSocketUtil().broadcast(this.getSocketIds(), "SectorUpdated", {
        gameMode: this.gameMode
      })
    }
  }

  isStale() {
    let twoMinutes = Date.now() - this.gameStartTime > (1000 * 60 * 2)
    return twoMinutes && !this.isReady()
  }

  isReady() {
    return this.isGameReady
  }

  addSessionResumeRequest(uid, socket) {
    this.sessionResumptionRequests[uid] = socket
  }

  initCommands() {
    for (let name in Commands) {
      let klass = Commands[name]
      let command = new klass(this)
      this.commands[name] = command
    }
  }

  async initSurvivalSector(metadata = {}, entities) {
    if (metadata.timestamp) {
      this.timestamp = metadata.timestamp.toNumber()
      this.hour = this.getHourFromTimestamp(this.timestamp)
      this.isNight = this.hour < 6 || this.hour >= 18
    }

    let sector = new SurvivalSector(this, metadata, entities)
    await this.initCreatorTeam()
  }

  async initCreatorTeam() {
    // ensure we fetch the creator name if not present
    // this is for old save files where team creatorName was not serialized
    let creatorTeam = this.getCreatorTeam()
    if (creatorTeam && !creatorTeam.getCreatorName()) {
      if (this.sectorModel) {
        creatorTeam.creatorUid = this.sectorModel.creatorUid
        creatorTeam.creatorName = this.sectorModel.username
      }
    }
  }

  runCommand(message, query) {
    let result = true
    let sector = this.sector
    let count = query ? parseInt(query.count) : 1

    switch(message) {
      case "memoryUsage":
        gc()
        console.log(process.memoryUsage())
        result = process.memoryUsage().heapUsed
        break
      case "createWall":
        for (var i = 0; i < count; i++) {
          let ground = sector.findRandomGround()
          Buildings.Wall.build({ x: ground.getX(), y: ground.getY() } , sector)
        }
        break
      case "spawnMob":
        let x = sector.randomSpawnPos()
        let y = sector.randomSpawnPos()
        sector.spawnMob({ x: x, y: y, type: "BioRaptor", count: count })
        break
      case "removeMobs":
        sector.removeAllMobs()
        break
      default:
    }

    return result
  }

  getStarBaseBlueprintData() {
    return require("./../../" + Constants.ShipDesignDirectory + "base_station.json")
  }

  getLobbyBlueprintData() {
    return require("./../../" + Constants.ShipDesignDirectory + "building_3.json")
  }

  getHourFromTimestamp(timestamp) {
    const hoursPerSecond = 1/Constants.secondsPerHour
    const secondsPerTick = 1/Constants.physicsTimeStep

    const beginningHour = 0
    return (Math.floor(timestamp * secondsPerTick * hoursPerSecond) + beginningHour) % 24
  }

  calculateHour() {
    let hour = this.getHourFromTimestamp(this.timestamp)

    if (this.hour !== hour) {
      this.hour = hour
      this.onHourChanged()
    }
  }

  onHourChanged() {
    const isNight = this.hour < 6 || this.hour >= 18

    if ((this.isNight !== isNight)) {
      this.isNight = isNight
      this.onDayNightChanged()
    }

    this.sector.onHourChanged(this.hour)
    this.eventManager.onHourChanged(this.hour)

    this.forEachPlayer((player) => {
      player.onHourChanged(this.hour)
    })

    if (this.isMiniGame()) {
      if (this.sector.eventHandler.isRoundStarted) {
        // in case first one didnt reach matchmaker. send it again
        this.onRoundStarted()
      }
    }
  }

  forEachPlayer(cb) {
    for (let playerId in this.players) {
      cb(this.players[playerId])
    }
  }

  onDayNightChanged() {
    this.sector.onDayNightChanged(this.isNight)
    this.eventManager.onDayNightChanged(this.sector.getDayCount())
  }

  incrementTeamsDayCount() {
    for (let id in this.teams) {
      let team = this.teams[id]
      if (team.isActive()) {
        team.incrementDayCount()
      }
    }
  }

  recordClock() {
    this.clock = (new Date()).getTime()
  }


  platformerWorldStep(deltaTime) {
    this.timestamp += 1
    this.calculateHour()

    if (this.shouldPause) {
      this.sector.safeExecuteTurn(this.sector.voteManager)
      this.forEachPlayer((player) => {
        player.executeOnPause()
      })
      return
    }

    this.eventManager.onWorldStep()

    this.preWorldStep()

    this.forEachCollidableBody((body) => {
      this.stepBody(body, deltaTime)
    })

    this.postWorldStep()
  }

  pauseCooldown() {
    this.shouldCooldownPause = true
  }

  resumeCooldown() {
    this.shouldCooldownPause = false
  }

  stepBody(body, deltaTime) {
    try {
      // flags
      body.entity.resetFlags()
      body.entity.decreaseForce()

      // horizontal acceleration
      body.entity.move(deltaTime)
      body.entity.integratePreviousVerticalSpeed()

      this.integrateForce(body)
      body.entity.applyGravity()

      // apply tile collision constraints (order important)
      body.entity.limitVerticalMovement()
      body.entity.limitHorizontalMovement()
      body.entity.applyVelocityAdjustment()

      // movement
      body.entity.setPositionFromVelocity()

      // damping
      body.entity.dampenVelocity()
    } catch(e) {
      this.captureException(e)
    }
  }

  ignoreBorders(body) {
    return body.entity instanceof Projectiles.Missile
  }

  dampenVelocity(body) {
    body.entity.dampenVelocity()
  }

  integrateForce(body) {
    vec2.add(body.velocity, body.velocity, body.force)

    // velocity should not exceed speed
    let speed = body.entity.getMaxSpeedFromForce()
    if (speed) {
      body.velocity[0] = Math.abs(body.velocity[0]) > speed ? speed * Math.sign(body.velocity[0]) : body.velocity[0]
      body.velocity[1] = Math.abs(body.velocity[1]) > speed ? speed * Math.sign(body.velocity[1]) : body.velocity[1]
    }

  }

  preWorldStep() {
  }

  broadcastError(msg) {
    for (let id in this.teams) {
      let team = this.teams[id]
      team.forEachMember((player) => {
        player.showError(msg, { isWarning: true })
      })
    }
  }

  broadcastTeamPositions() {
    for (let id in this.teams) {
      let team = this.teams[id]
      team.sendChangedMapPositions()
    }
  }

  canBeShutdown() {
    if (this.isPvP()) return false

    return this.getPlayerCount() === 0
  }

  shutdownOnZeroPlayers() {
    const isTwentySecondInterval = this.timestamp % (Constants.physicsTimeStep * 20) === 0
    if (!isTwentySecondInterval) return

    // sometimes player takes a long time to join game.
    // take into account game is initially but still waiting
    // for sector to finish asynchronously loading
    // prevent premature shutdown
    if (this.getReadyDuration() < (10 * 1000)) {
      return
    }

    if (this.canBeShutdown()) {
      LOG.info(`Sector ${this.sectorUid} inactive with 0 players. Removing game.`)
      this.prepareRemove()
    }
  }

  removeOnForced() {
    if (this.forceRestart && this.timestamp >= this.serverRestartTimestamp) {
      this.forEachPlayer((player) => {
        if (player.socket) player.socket.close()
        player.remove()
      })
      this.prepareRemove()
    }
  }

  getReadyDuration() {
    if (!this.readyTime) return 0
    return Date.now() - this.readyTime
  }

  async prepareRemove() {
    if (this.isPreparingRemoval) return
    this.isPreparingRemoval = true

    if (this.isTutorial || this.isMiniGame()) {
      this.remove()
      return
    }

    if (this.isCreatedByAnonynmous()) {
      let creator = [this.creatorUid, this.getCreatorIp()].join("-")
      LOG.info(`Sector ${this.sectorUid} ${this.sector.name} is anonymously created by ${creator}. Removing save file`)
      await WorldSerializer.deleteSector(this.getSectorUid())
      let sectorModel = await SectorModel.findOne({
        where: { uid: this.getSectorUid() }
      })

      if (sectorModel) {
        await sectorModel.destroy()
      }

      this.remove()
      return
    }


    this.preSaveWorldBeforeGameShutdown()

    if (this.isSaving) {
      await this.waitUntilSavingFinished()
    } else {
      await this.saveWorld()
    }
    this.remove()
  }

  async waitUntilSavingFinished() {
    await this.delay(1000)

    if (!this.isSaving) {
      return true
    } else {
      return this.waitUntilSavingFinished()
    }
  }

  delay(time) {
    return new Promise(function(resolve) {
       setTimeout(resolve.bind(null), time)
    })
  }

  isCreatedByAnonynmous() {
    if (!this.creatorUid) return true

    let uuidv4Regex = new RegExp(/^[0-9A-F]{8}-[0-9A-F]{4}-4[0-9A-F]{3}-[89AB][0-9A-F]{3}-[0-9A-F]{12}$/i)
    return uuidv4Regex.test(this.creatorUid)
  }

  setPersistent(isPersistent) {
    this.isPersistent = isPersistent
  }

  async remove() {
    global.dg = null
    this.isRemoved = true

    if (this.isPersistent) return

    // for now, clear all object pools to avoid unwanted memory references
    // tbd: object pool per game
    ObjectPool.reset()

    this.forEachPlayer((player) => {
      player.remove()
    })

    let sectorData = this.getSectorData()

    this.sendToMatchmaker({ event: "SectorRemoved", data: sectorData })

    if (this.isPvP()) {
      await FirebaseAdminHelper.removePvPSector(this.sector.uid)
    }


    this.cleanup()
    this.server.removeGame(this)
  }

  preSaveWorldBeforeGameShutdown() {
    for (let teamId in this.eventManager.eventsByTeam) {
      let eventsMap = this.eventManager.eventsByTeam[teamId]
      if (eventsMap.tax_collection) {
        let messenger = eventsMap.tax_collection
        if (messenger.paymentReceived) {
          messenger.remove()
        }
      }
    }
  }

  postWorldStep() {
    this.processCommandQueue()
    this.sector.executeTurn()
    this.runTimers()

    this.broadcastTeamPositions()
  }

  getObjectPoolInstance() {
    return ObjectPool
  }

  distance(x1, y1, x2, y2) {
    return Helper.distance(x1, y1, x2, y2)
  }

  distanceBetween(entity, otherEntity) {
    if (entity.getContainer().isMovable()) {
      return this.distance(entity.getRelativeX(), entity.getRelativeY(), otherEntity.getRelativeX(), otherEntity.getRelativeY())
    } else {
      return this.distance(entity.getX(), entity.getY(), otherEntity.getX(), otherEntity.getY())
    }
  }

  midpoint(x1, y1, x2, y2) {
    return [x1 + x2 / 2, y1 + y2 / 2]
  }

  pointFromDistance(x, y, distance, radian) {
    const xp = distance * Math.cos(radian)
    const yp = distance * Math.sin(radian)

    return [x + xp, y + yp]
  }

  angle(x1, y1, x2, y2) {
    return Math.atan2(y2 - y1, x2 - x1)
  }

  normalizeAngleDeg(deg) {
    return ((deg % 360) + 360) % 360
  }

  lenpoint(x1, y1, x2, y2, len) {
    const dx = x2 - x1
    const dy = y2 - y1
    const theta = Math.atan2(dy, dx)
    const xp = len * Math.cos(theta)
    const yp = len * Math.sin(theta)

    return [xp + x1, yp + y1]
  }

  // player, mob, projectile, ship
  // different from p2 bodies
  forEachCollidableBody(cb) {
    for (let id in this.sector.players) {
      cb(this.sector.players[id].body)
    }

    for (let id in this.sector.mobs) {
      cb(this.sector.mobs[id].body)
    }

    for (let id in this.sector.projectiles) {
      cb(this.sector.projectiles[id].body)
    }

    for (let id in this.sector.ships) {
      cb(this.sector.ships[id].body)
    }

    for (let id in this.sector.transports) {
      cb(this.sector.transports[id].body)
    }
  }

  calculateDistance(entity, otherEntity) {
    let x = entity.getX() - otherEntity.getX()
    let y = entity.getY() - otherEntity.getY()

    if (entity.isShield() || otherEntity.isShield()) {
      // https://stackoverflow.com/a/5509234
      // sqrt((x2 − x1)^2 + (y2 − y1)^2) − (r2 + r1)

      return Math.sqrt((x * x) + (y * y)) - (entity.getCircle().radius + otherEntity.getCircle().radius)
    }


    return Math.sqrt((x * x) + (y * y))
  }

  getNumPlayers() {
    return Object.keys(this.players).length
  }

  getPlayerCount() {
    return this.getNumPlayers()
  }

  setPhysicsStep(timestep) {
    this.fixedTimeStep = timestep
    this.maxSubSteps = 5
  }

  onProjectileProjectileCollide(projectile, otherProjectile) {
  }

  onPlayerProjectileCollide(player, projectile) {
  }

  getSellableGroups() {
    return ["Mobs", "Buildings", "Equipments", "Ores", "Bars", "Foods", "Ammos"]
  }

  getSellableKlass(group, type) {
    let invalidGroup = this.getSellableGroups().indexOf(group) === -1
    if (invalidGroup) {
      return null
    }

    if (group === "Mobs") {
      let mobKlass = Mobs.forType(type)
      if (!mobKlass) return null

      return mobKlass
    } else {
      return Item.getKlass(type)
    }
  }

  getPlayerForSocketId(socketId) {
    return this.getPlayer(socketId)
  }

  sendUpdates() {
    if (process.env.SIMULATE_LAG) {
      let minDelay = 200
      let delay = Math.floor(Math.random() * 250) +  minDelay
      setTimeout(this.sendUpdatesToClients.bind(this), delay)
    } else {
      this.sendUpdatesToClients()
    }

  }

  getStat(stat) {
    return this.server.getStat(stat)
  }

  sendUpdatesToClients() {
    // add server clock
    this.gameInfo["timestamp"] = this.timestamp

    // add server performance info
    if (this.timestamp % Constants.physicsTimeStep === 0) {
      let tickDuration = this.getStat("tick").maxDuration
      if (tickDuration) {
        this.gameInfo["tick"] = tickDuration
      }
    } else {
      this.gameInfo["tick"] = null
    }

    let memory = this.getStat("memory").usage

    // get player positions
    for(let i in this.players) {
      let player = this.players[i]
      if(player.isReady() && player.shouldSendToClient()) {
        if (player.lastServerMemory !== memory) {
          player.lastServerMemory = memory
          this.gameInfo["memory"] = memory
        } else {
          this.gameInfo["memory"] = null
        }

        if (player.getSentHour() === null ||
            player.getSentHour() !== this.sector.getHour()) {
          player.setSentHour(this.sector.getHour())
          this.gameInfo["hour"] = this.sector.getHour()
          this.gameInfo["day"]  = this.sector.getDayCount()
        } else {
          this.gameInfo["day"]  = null
          this.gameInfo["hour"] = null
        }

        if (player.isCameraMode()) {
          this.gameInfo["camera"] = player.getCamera().toJson()
        }

        this.getSocketUtil().emit(player.socket, "GameState", this.gameInfo)
      }
    }

    this.sendLeaderboardStats()

    this.sector.removeHitscanProjectiles()
    this.sector.pathFinder.markChangesRead() // used for delta compressed, checking json changed
    this.sector.sendChangeRoomsForPlayer()
    this.sector.sendFullChunks()
    this.sector.sendChangedChunks()
    this.sector.sendChangedPlayers()
    this.sector.sendHomeArea()
  }

  sendLeaderboardStats() {
    const isTenSecondInterval = this.timestamp % (Constants.physicsTimeStep * 10) === 0
    if (!isTenSecondInterval && !this.forceSendLeaderboard) return

    this.forceSendLeaderboard = false

    let topTeams = this.getTopTeams()
    let topPlayers = this.getTopPlayers()

    for(let id in this.players) {
      let player = this.players[id]
      this.getSocketUtil().emit(player.socket, "Leaderboard", { rankings: topTeams, playerRankings: topPlayers })
    }
  }

  getTopPlayers() {
    let playerList = Object.values(this.players)

    let sortedPlayerList = playerList.sort((player, otherPlayer) => {
      return otherPlayer.score - player.score
    })

    return sortedPlayerList.splice(0, 10)
  }

  getTopTeams() {
    let teamList = []

    for (let id in this.teams) {
      let team = this.teams[id]
      if (team.getMemberCount() > 0) {
        teamList.push(team.getRankingJson())
      }
    }

    let sortedTeamList = teamList.sort((team, otherTeam) => {
      return otherTeam.score - team.score
    })

    let topTenTeams = sortedTeamList.splice(0, 10)
    return topTenTeams
  }

  stepWorld() {
    if (!this.isGameReady) return

    // fixedTimeStep = seconds per frame
    this.platformerWorldStep(this.fixedTimeStep)
    this.cleanupPlayers()
    this.cleanupReservedSpots()
    this.cleanupTeamIpBlacklist()
    this.cleanupPlayerDataMap()
    this.cleanupLeavingPlayers()
    this.cleanupCharacterRestarts()
  }

  getBuilding(data) {
    if (data.type === "buildings") {
      return this.buildings[data.id]
    } else if (data.type === "units") {
      return this.units[data.id] } else {
      return null
    }
  }

  getPlayerList() {
    const keys = Object.keys(this.players)
    const values = keys.map((v) => {
      return this.players[v]
    })

    return values
  }

  getPlayer(socketId) {
    const playerId = this.playerIdMap[socketId]
    return this.players[playerId]
  }

  addPlayer(player) {
    this.players[player.id] = player
    this.playerIdMap[player.getSocketId()] = player.id

    this.createSidebar(player)

    this.onPlayerJoined(player)
    this.onPlayerCountChanged()
    this.onAlivePlayerCountChanged()

    this.sector.onScoreChanged()
  }

  sendSectorInfoToMatchmaker() {
    if (env === 'test') return
    if (this.isRemoved) return

    this.sendToMatchmaker({ event: "SectorUpdated", data: this.getSectorData() })
  }

  addPlayerData(playerData) {
    this.playerDataMap[playerData.getUID()] = playerData
  }

  removePlayerData(playerData) {
    delete this.playerDataMap[playerData.getUID()]
  }

  getSocketIds() {
    let sockets = []
    return Object.keys(this.playerIdMap)
  }

  removePlayer(player) {
    if (typeof player === "undefined") return

    let role = (player.getRole() && player.getRole().name) || "Guest"

    this.triggerEvent("PlayerLeft", {
      playerId: player.getId(),
      player: player.getName(),
      playerRole: player.getRoleName()
    })

    const playerId = player.id
    const socketId = player.getSocketId()

    delete this.players[playerId]
    delete this.playerIdMap[socketId]

    this.removeSidebar(player)

    this.onPlayerCountChanged()
    this.onAlivePlayerCountChanged()

    this.sendCreatorLeaveSectorToMatchmaker(player)
    this.sector.onScoreChanged()

    return playerId
  }

  onAlivePlayerCountChanged() {
    this.triggerEvent("AlivePlayerCountChanged")
  }

  onPlayerJoined(player) {
    this.triggerEvent("PlayerJoined", {
      playerId: player.getId(),
      playerName: player.getName(),
      player: player.getName(),
      playerRole: player.getRoleName()
    })
  }

  sendCreatorLeaveSectorToMatchmaker(player) {
    if (this.creator === player) {
      let data = {
        env: this.getEnvironment(),
        region: this.getRegion(),
        creatorIp: this.getCreatorIp(),
        creatorUid: this.getCreatorUid()
      }

      this.sendToMatchmaker({ event: "CreatorLeaveSector", data: data })
    }
  }

  isCreatedByPlayer(player) {
    let isUidMatch = this.getCreatorUid() === player.getUid()
    let isSessionIdMatch = this.getCreatorSessionId() === player.getSessionId()
    return isUidMatch || isSessionIdMatch
  }

  cleanup() {
    this.sector.cleanup()
    this.clearEventBusListeners()
  }

  clearEventBusListeners() {
    let listeners = EventBus.listeners

    for (let key in listeners) {
      let gameId = key.split(":")[0]
      if (gameId === this.getId()) {
        delete EventBus.listeners[key]
      }
    }
  }

  isUsernameTakenInServer(username) {
    let result = false

    for (let playerId in this.players) {
      let player = this.players[playerId]
      if (player.getName().toLowerCase() === username.toLowerCase()) {
        result = true
        break
      }
    }

    return result
  }

  createPlayerFromPlayerData(socket, playerData) {
    try {
      let inventoryCount = Object.keys(playerData.data.inventory.storage).length
      LOG.info("Creating from PlayerData: " + playerData.data.name + " with inventory count: " + inventoryCount)
      let player = new Player(socket, playerData.data, this.sector)
      if (!this.creator && this.isCreatedByPlayer(player)) {
        this.creator = player
      }

      playerData.transferOwnershipsTo(player)
      playerData.remove()

      return player
    } catch(e) {
      this.captureException(e)
      return null
    }
  }

  getMainPlayer() {
    return Object.values(this.players)[0]
  }

  isValidUsername(username) {
    return !username.match(/[^a-zA-Z0-9_]/)
  }

  hasPlayerAlreadyJoined(options = {}) {
    if (options.sessionId) {
      let player = this.getPlayerBySessionId(options.sessionId)
      return player && player.isConnected()
    }

    if (options.uid) {
      let player = this.getPlayerByUID(options.uid)
      return player && player.isConnected()
    }
  }

  getPlayerBySessionId(sessionId) {
    if (sessionId.length === 0) return null

    let targetPlayer

    for (let playerId in this.players) {
      let player = this.players[playerId]
      if (player.getSessionId() === sessionId) {
        targetPlayer = player
        break
      }
    }

    return targetPlayer
  }

  getPlayerDataBySessionId(sessionId) {
    if (sessionId.length === 0) return null

    let targetPlayerData

    for (let uid in this.playerDataMap) {
      let playerData = this.playerDataMap[uid]
      if (playerData.getSessionId() === sessionId) {
        targetPlayerData = playerData
        break
      }
    }

    return targetPlayerData
  }

  getCreatorTeam() {
    return Object.values(this.teams).filter((team) => {
      return team.isSectorOwner()
    })[0]
  }

  remainingDays(ipBan) {
    if (!ipBan.createdAt) return 365
    let dayCount = ipBan.dayCount
    let timeDiff = Date.now() - ipBan.createdAt.getTime()
    let dayDiff = Math.floor(timeDiff / (1000 * 3600 * 24))

    let remaining = dayCount - dayDiff
    if (remaining < 0) return 0

    return remaining
  }

  formatBanMsg(ipBan) {
    let msg = "Banned"

    let remaining = this.remainingDays(ipBan)
    if (remaining) {
      msg += ` for ${remaining} days.`
    } else {
      msg += "."
    }

    if (ipBan.reason) {
      msg += ` Reason: ${ipBan.reason}`
    }

    return msg
  }

  async join(socket, data) {
    socket.gameId = this.id
    socket.locale = data.locale

    if (!this.isGameReady) {
      this.getSocketUtil().emit(socket, "CantJoin", { message: "Server initializing. Try again after a few seconds." })
      return
    }

    if (this.isPvP()) {
      if (this.getPlayerCount() >= 50) {
        this.getSocketUtil().emit(socket, "CantJoin", { message: "Server is full" })
        return
      }
    }

    if (this.isMiniGame()) {
      if (this.sector.eventHandler.isRoundStarted &&
          !this.sector.miniGame.canAcceptPlayersMidGame()) {
        this.getSocketUtil().emit(socket, "CantJoin", { message: "Round already started" })
        return
      }

      let ipAddress = Helper.getSocketRemoteAddress(socket)
      let requestId = base64id.generateId()
      this.pendingMatchmakerChecks[requestId] = { socket: socket, data: data }
      let options = {
        playerRemoteAddress: ipAddress,
        fingerprint: data.fingerprint,
        requestId: requestId,
        gameId: this.id
      }
      this.sendToMatchmaker({ event: "CanPlayerJoin", data: options })
      return
    }

    await this.performJoinGame(socket, data)
  }

  async onCanPlayerJoinResponse(requestId, canJoin) {
    let data = this.pendingMatchmakerChecks[requestId]
    if (!data) return

    delete this.pendingMatchmakerChecks[requestId]

    if (!canJoin && !debugMode) {
      this.getSocketUtil().emit(data.socket, "CantJoin", { message: "Already in another game" })
      return
    }

    await this.performJoinGame(data.socket, data.data)
  }

  initScenes() {
    let scene = this.createScene("VotingSkipped")
    scene.setCamera({ row: 43, col: 70, isPositionBased: true })
    scene.addAction({ secondsTimestamp: 0, command: `/caption title Voting Skipped`  })
    scene.addAction({ secondsTimestamp: 2, command: `/caption title `  })
    scene.setDuration(2)

    scene = this.createScene("EjectImposter")
    scene.setCamera({ row: 90, col: 10, isPositionBased: true })
    scene.addAction({ secondsTimestamp: 0, command: `/tp {votedPlayer} 90 10`  })
    scene.addAction({ secondsTimestamp: 0, command: `/effect give {votedPlayer} spin`  })
    scene.addAction({ secondsTimestamp: 0, command: `/force {votedPlayer} 50 0`  })
    scene.addAction({ secondsTimestamp: 1, command: `/caption subtitle It is {not} the imposter`  })
    scene.addAction({ secondsTimestamp: 5, command: `/kill {votedPlayer}`  })
    scene.addAction({ secondsTimestamp: 5, command: `/caption subtitle `  })
    scene.setDuration(5)

    scene = this.createScene("EmergencyMeeting")
    scene.setCamera({ row: 42, col: 70, isPositionBased: true })
    scene.addAction({ secondsTimestamp: 1, command: `/caption title Who is the imposter....`  })
    scene.addAction({ secondsTimestamp: 3, command: `/caption title `  })
    scene.setDuration(3)

    scene = this.createScene("StationExplode")
    scene.setCamera({ row: 42, col: 70, isPositionBased: true })
    scene.addAction({ secondsTimestamp: 1, command: `/projectile explosion {row} {col} scatter:true damage:400 shouldHitFloor:true`  })
    scene.setDuration(3)

    scene = this.createScene("StarmancerTDMobSpawn")
    scene.setCamera({ row: 9, col: 64, isPositionBased: true })
    scene.setDuration(3)

    scene = this.createScene("StarmancerTDProtectCore")
    scene.setCamera({ row: 101, col: 64, isPositionBased: true })
    scene.addAction({ secondsTimestamp: 1, command: `/caption title Protect the Core`  })
    scene.addAction({ secondsTimestamp: 4, command: `/caption subtitle `  })
    scene.setDuration(4)

    scene = this.createScene("BurnImposter")
    scene.setCamera({ row: 64, col: 17, isPositionBased: true })
    scene.addAction({ secondsTimestamp: 0, command: `/tp {votedPlayer} 64 17`  })
    scene.addAction({ secondsTimestamp: 0, command: `/team leave {votedPlayer} void`  })
    scene.addAction({ secondsTimestamp: 1, command: `/interact 9101 shoot`  })
    scene.addAction({ secondsTimestamp: 1, command: `/interact 9102 shoot`  })
    scene.addAction({ secondsTimestamp: 1, command: `/interact 9103 shoot`  })
    scene.addAction({ secondsTimestamp: 1, command: `/interact 9104 shoot`  })
    scene.addAction({ secondsTimestamp: 1, command: `/interact 9250 shoot`  })
    scene.addAction({ secondsTimestamp: 1, command: `/interact 9258 shoot`  })
    scene.addAction({ secondsTimestamp: 1, command: `/interact 9259 shoot`  })
    scene.addAction({ secondsTimestamp: 1, command: `/interact 9260 shoot`  })
    scene.addAction({ secondsTimestamp: 2, command: `/caption subtitle It is {not} the imposter`  })
    scene.addAction({ secondsTimestamp: 5, command: `/caption subtitle `  })
    scene.setDuration(5)
  }

  async performJoinGame(socket, data) {
    // check if ip blacklisted
    let ipAddress = Helper.getSocketRemoteAddress(socket)
    let banSets = await this.server.getBanSets()
    let ipBan   = banSets.ipBanSet[ipAddress]
    if (ipBan && !data.idToken) {
      if (this.server.isBanExpired(ipBan)) {
        this.server.removeBan({ ip: [ipBan.ip] })
      } else {
        this.getSocketUtil().emit(socket, "CantJoin", {
          message: this.formatBanMsg(ipBan)
        })

        return
      }
    }

    if (this.hasPlayerAlreadyJoined({ sessionId: socket.sessionId })) return

    let uid

    if (data.idToken) {
      uid = await this.server.getUidFromRequest(data.idToken, data.uid)
      if (!uid) {
        this.getSocketUtil().emit(socket, "CantJoin", { message: "Player credentials are invalid. Unable to load save file." })

        let signInAlert = `[performJoinGame] ${ipAddress} used invalid idToken ${data.idToken}`
        ExceptionReporter.captureException(new Error(signInAlert))
        LOG.info(signInAlert)
        return
      }

      let userModel = await User.findOne({ where: { uid: uid } })
      if (!userModel) {
        ExceptionReporter.captureException(new Error("used missing uid " + uid + " idToken: " + data.idToken))
        return
      }

      data.username = userModel.username

      let userBan = banSets.userBanSet[data.username.toLowerCase()]
      if (userBan) {
        if (this.server.isBanExpired(userBan)) {
          this.server.removeBan({ ip: [userBan.ip] })
        } else {
          this.getSocketUtil().emit(socket, "CantJoin", {
            message: this.formatBanMsg(userBan)
          })

          return
        }
      }

      let existingPlayer = this.getPlayerByUID(uid)
      if (existingPlayer) {
        this.handleExistingLoggedInPlayer(socket, existingPlayer)
        return
      }

      let playerData = this.getPlayerData(uid)
      if (playerData) {
        if (data.username) {
          playerData.name = data.username
          playerData.data.name = data.username
        }

        if (data.isNewTeam && this.isPvP()) {
          let team = playerData.getTeam()
          team.removeOfflineMember(playerData.data)
          delete playerData.data["team"]
          let loadedPlayer = this.resumeFromSaveFile(socket, playerData, data.idToken)
          if (loadedPlayer) return
        } else {
          let team = playerData.getTeam()

          if (team && team.isBanned(Helper.getSocketRemoteAddress(socket), uid)) {
            this.getSocketUtil().emit(socket, "CantJoin", { message: "Previously kicked or banned from the team. Unable to join" })
            return
          }

          let loadedPlayer = this.resumeFromSaveFile(socket, playerData, data.idToken)
          if (loadedPlayer) {
            return
          }
        }
      }

      if (uid) {
        data.uid = uid
        data.isAuthenticated = true
      }
    } else if (data.username) {
      let isTaken = false
      isTaken = await User.isUsernameTaken(data.username)
      let isTakenInServer = this.isUsernameTakenInServer(data.username)
      if (isTaken || isTakenInServer) {
        this.getSocketUtil().emit(socket, "CantJoin", { message: "username is already taken" })
        return
      }

    }

    let sectorToJoin
    let teamToJoin = this.getCreatorTeam()

    if (teamToJoin) {
      if (teamToJoin.isBanned(Helper.getSocketRemoteAddress(socket), uid)) {
        this.getSocketUtil().emit(socket, "CantJoin", { message: "Previously kicked or banned from the team. Unable to join" })
        return
      }
    }

    if (this.sector.isFull()) {
      this.getSocketUtil().emit(socket, "CantJoin", { message: "Colony Full" })
      return
    }

    sectorToJoin = this.sector
    data.team = teamToJoin

    if (data.username && data.username.match(/[^a-zA-Z0-9_]/)) {
      data.username = null
    }

    if (!data.username) {
      let username = await this.generateUniqueUsername()
      data.username = username
    }

    let player

     player = new Player(socket, data, sectorToJoin)
     if (!this.creator && this.isCreatedByPlayer(player)) {
       if (!this.creatorUid) {
         this.setCreatorUid(player.getUid())
       }
       this.creator = player
     }

     // hack to send player team to matchmaker
     // as isSectorOwner will have correct value by now
     // FIX: TBD
     player.getTeam() && player.getTeam().onTeamChanged()

    // if (debugMode) {
    //     let playerData = Object.values(this.playerDataMap).find((pd) => { return pd.data.name === 'kuroro' })
    //     player = this.createPlayerFromPlayerData(socket, playerData)
    //     this.setCreatorUid(player.getUid())
    //     this.creator = player
    // }

    await this.broadcastPlayerJoin(player)
    this.announceEvents(player)

  }

  setActiveScene(scene) {
    this.activeScene = scene
  }

  isFull() {
    return this.getPlayerCount() >= 5
  }

  endGame(player) {

  }

  announceEvents(player) {
    let team = player.getTeam()
    let raid = this.eventManager.getTeamEvent(team, Constants.Events.Raid)
    if (raid && raid.shouldBeAnnounced()) {
      this.eventManager.emitEvent(player, "Raid")
    }
  }

  getVisibleTeams() {
    let result = {}

    for (let id in this.colonies) {
      let team = this.colonies[id]
      if (this.sector.shouldShowPlayerList()) {
        result[id] = team
      } else {
        result[id] = team.getJsonWithoutMembers()
      }
    }

    return result
  }

  getSuitColorByIndex(index) {
    let result = ""

    for (let label in Constants.SuitColors) {
      if (Constants.SuitColors[label].index === index) {
        result = label
        break
      }
    }

    return result
  }

  async broadcastPlayerJoin(player, options = {}) {
    if (!player) return

    LOG.info(player.name + " joined " + player.sector.getName() + " [" + player.sector.getUid() + "] with ip: " + player.getRemoteAddress())

    let payload = {
      playerId: player.id,
      uid: player.uid,
      sector: player.sector,
      inventory: player.inventory,
      equipIndex: player.equipIndex,
      players: player.sector.players,
      teams: this.getVisibleTeams(),
      gold: player.gold,
      oxygen: player.getOxygen(),
      stamina: player.getStamina(),
      hunger: player.getHunger(),
      creatorUid: this.getCreatorUid(),
      host: this.server.getHost(),
      playerUid: player.getUid(),
      pid: global.pid,
      roles: player.getTeam().roles,
      revision: this.getRevision(),
      version: this.getVersion(),
      day: this.sector.getDayCount(),
      hour: this.sector.getHour(),
      isMiniGame: this.isMiniGame(),
      sidebar: this.sidebars[player.getId()],
      objectives: player.objectives,
      dialogueMap: this.dialogueMap
    }

    if (this.serverRestartTimestamp) {
      payload.serverRestartTimestamp = this.serverRestartTimestamp
      payload.restartReason = this.restartReason
    }

    if (this.sector.isUpvotable()) {
      let hasUpvoted = await player.hasUpvoted()
      if (hasUpvoted) {
        payload['hasUpvoted'] = true
      }
    }

    if (this.isMiniGame() && this.sector.miniGame.shouldSendFullMap()) {
      payload['fullMap'] = { chunks: [] }
      this.sector.forEachChunk((chunk) => {
        let chunkData = chunk.getAllData(true)
        payload['fullMap']['chunks'].push(chunkData)
      })
    }

    this.getSocketUtil().emit(player.getSocket(), "JoinGame", payload)
    let topTeams = this.getTopTeams()
    this.getSocketUtil().emit(player.socket, "Leaderboard", { rankings: topTeams })

    if (!options.playerOnly) {
      this.getSocketUtil().broadcast(player.sector.getSocketIds(), "OtherPlayerJoined", { player: player }, { excludeSocketId: player.getSocketId() })
    }

    this.requestTeamPositions(player)
    player.getTeam().sendTeamResidents(player)
  }

  findPlayersWithTag(playerTag) {
    let result = []

    for (let id in this.players) {
      let player = this.players[id]
      if (player.getUid() === playerTag ||
          player.getRemoteAddress() === playerTag) {
        result.push(player)
      }
    }

    return result
  }

  findPlayerWithUsername(username) {
    let result

    for (let id in this.players) {
      let player = this.players[id]
      if (player.name === username) {
        result = player
        break
      }
    }

    return result
  }

  findPlayerWithTag(playerTag) {
    let result

    for (let id in this.players) {
      let player = this.players[id]
      if (player.getUid() === playerTag ||
          player.getRemoteAddress() === playerTag) {
        result = player
        break
      }
    }

    return result
  }

  requestTeamPositions(player) {
    if (this.sector.isFovMode()) return

    let team = player.getTeam()

    if (team) {
      team.forEachMember((member) => {
        team.addChangedMapPosition(member)
      })
    }
  }

  getPlayerById(id) {
    return this.players[id]
  }

  getPlayerByUID(uid) {
    let result = null

    // check currnet player dictionary
    this.forEachPlayer((player) => {
      if (player.uid === uid) {
        result = player
      }
    })

    return result
  }

  getEntityByNameOrId(name) {
    // player or mob
    let player = this.getPlayerByName(name)
    if (player) return player

    let mob = this.getMobByName(name)
    if (mob) return mob

    return this.getEntity(name)
  }

  getPlayerByNameOrId(name) {
    if (!name) return null

    if (typeof name === 'string') {
      name = name.replace(/'/g, "")
    }

    let player = this.getPlayerByName(name)
    if (player) return player

    return this.getPlayerById(name)
  }

  getPlayerByName(name) {
    let result = null
    if (!name) return null

    name = name.toString()

    // check currnet player dictionary
    this.forEachPlayer((player) => {
      if (player.name.toLowerCase() === name.toLowerCase()) {
        result = player
      }
    })

    return result
  }

  getMobByName(name) {
    let result = null
    if (!name) return null

    // check currnet player dictionary
    this.sector.forEachPlayerMobs((mob) => {
      if (mob.name && mob.name.toLowerCase() === name.toLowerCase()) {
        result = mob
      }
    })

    return result
  }

  async resumeSession(socket, sessionId) {
    let existingPlayer = this.getPlayerBySessionId(sessionId)

    // player state still in game, simply reattach
    if (existingPlayer) {
      this.resumeSessionForExistingPlayer(existingPlayer, socket)
      return true
    }

    let existingPlayerData = this.getPlayerDataBySessionId(sessionId)

    if (existingPlayerData) {
      existingPlayerData.data.isAuthenticated = true
      let player = this.createPlayerFromPlayerData(socket, existingPlayerData)
      player.setLocale(socket.locale)
      await this.broadcastPlayerJoin(player)
      this.announceEvents(player)
      return true
    }

    this.join(socket, {})
  }

  async resumeSessionForExistingPlayer(existingPlayer, socket) {
    let oldSocket = existingPlayer.socket

    LOG.info(`resumeSessionForExistingPlayer ${existingPlayer.name}`)

    let isNewTabSession = socket.sessionId !== existingPlayer.getSessionId()

    existingPlayer.socket = socket
    this.onPlayerReconnected(existingPlayer, oldSocket.id)

    if (isNewTabSession) {
      await this.broadcastPlayerJoin(existingPlayer, { playerOnly: true })
      this.announceEvents(existingPlayer)
      existingPlayer.initClientState()
      existingPlayer.removeChunkSubscriptions()
      existingPlayer.requestNewChunks()
    } else {
      this.getSocketUtil().emit(socket, "SessionResume", {})
    }
  }

  handleExistingLoggedInPlayer(socket, existingPlayer) {
    this.resumeSessionForExistingPlayer(existingPlayer, socket)
  }

  async resumeIdToken(socket, idToken, userUid) {
    const uid = await this.server.getUidFromRequest(idToken, userUid)
    if (!uid) {
      this.getSocketUtil().emit(socket, "CantJoin", {
        message: "Player credentials are invalid. Unable to load save file."
      })
      return null
    }

    let existingPlayer = this.getPlayerByUID(uid)
    if (existingPlayer) {
      this.handleExistingLoggedInPlayer(socket, existingPlayer)
      return existingPlayer
    }

    let playerData = this.getPlayerData(uid)
    if (!playerData) {
      this.getSocketUtil().emit(socket, "CantJoin", { message: "Player Data not found in save file." })
      return
    }

    let team = playerData.getTeam()
    if (!team) {
      if (this.isPvP()) {
        delete playerData.data["team"]
      } else {
        this.getSocketUtil().emit(socket, "CantJoin", { message: "Team not found in save file." })
        return null
      }
    } else {
      if (team.isFull() && this.isPvP()) {
        this.getSocketUtil().emit(socket, "TeamFull", { team: team })
        return
      }
    }

    let loadedPlayer = this.resumeFromSaveFile(socket, playerData, idToken)
    if (loadedPlayer) {
      return
    }
  }

  async resumeFromSaveFile(socket, playerData, idToken) {
    playerData.data.isAuthenticated = true
    playerData.data.idToken = idToken

    let player = this.createPlayerFromPlayerData(socket, playerData)
    if (player) {
      player.setLocale(socket.locale)
      await this.broadcastPlayerJoin(player)
      this.announceEvents(player)
      return player
    }
  }

  getPlayerData(uid) {
    return this.playerDataMap[uid]
  }

  getSectorUid() {
    return this.sectorUid
  }

  getSectorData() {
    let data = {
      sectorId: this.sectorUid,
      env: this.getEnvironment(),
      region: this.getRegion(),
      ip: this.server.getHost(),
      host: this.server.getHost(),
      name: this.sector.getName(),
      version: this.getVersion(),
      revision: this.getRevision(),
      playerCount: this.getNumPlayers(),
      daysAlive: this.sector.getDayCount(),
      occupancy: this.sector.getOccupancyPercentage(),
      screenshots: this.sector.screenshots,
      gameMode: this.getGameMode(),
      isPrivate: this.sector.isPrivate,
      maxPlayers: this.getMaxPlayers(),
      language: this.language
    }

    if (this.isMiniGame()) {
      data['canAcceptPlayersMidGame'] = this.sector.miniGame.canAcceptPlayersMidGame()
    }

    if (this.isTutorial) {
      data["isTutorial"] = true
    }

    if (this.getCreatorIp()) {
      data["creatorIp"] = this.getCreatorIp()
    }

    if (this.getCreatorUid()) {
      data["creatorUid"] = this.getCreatorUid()
    }

    return data
  }

  getVersion() {
    return this.server.getVersion()
  }

  getRevision() {
    return this.server.getRevision()
  }

  getMaxPlayers() {
    if (this.isMiniGame()) {
      return this.sector.miniGame.getMaxPlayers()
    }

    return 20
  }

  hasTeamWithName(name) {
    let result = false

    for (let teamId in this.teams) {
      let team = this.teams[teamId]
      if (team.isJoinable() && team.getName() === name) {
        result = true
        break
      }
    }

    return result
  }

  getTeam(teamId) {
    return this.teams[teamId]
  }

  getTeamsJson() {
    let result = []

    for (let teamId in this.teams) {
      let team = this.teams[teamId]
      if (team.isJoinable()) {
        result.push(team.toJson())
      }
    }

    return result
  }

  cleanupTeamIpBlacklist() {
    const isThirtySecondInterval = this.timestamp % (Constants.physicsTimeStep * 30) === 0
    if (!isThirtySecondInterval) return

    for (let teamId in this.teams) {
      let team = this.teams[teamId]
      team.cleanupIpBlacklist(this.timestamp)
      team.cleanupUidBlacklist(this.timestamp)
    }
  }

  addTeam(team) {
    this.teams[team.id] = team
  }

  removeTeam(team) {
    delete this.teams[team.id]
  }

  addColony(team) {
    this.colonies[team.id] = team
  }

  removeColony(team) {
    delete this.colonies[team.id]
  }

  getRegion() {
    return this.server.getRegion()
  }

  getEnvironment() {
    return process.env["NODE_ENV"] || 'development'
  }

  onPlayerCountChanged() {
    this.server.onPlayerCountChanged()
    this.sendSectorInfoToMatchmaker()
    this.triggerEvent("PlayerCountChanged")

    if (this.canBeShutdown()) {
      LOG.info(`Sector ${this.sectorUid} inactive with 0 players. Removing game.`)
      this.prepareRemove()
    }
  }

  sendToMatchmaker(data) {
    this.server.sendToMatchmaker(data)
  }

  isTeamNameTaken(name) {
    return Object.values(this.teams).find((team) => {
      return team.name === name
    })
  }

  getAlivePlayers(condition) {
    let players = {}

    this.forEachPlayer((player) => {
      if (!player.isDestroyed()) {
        if (condition) {
          if (condition(player)) {
            players[player.id] = player
          }
        } else {
          players[player.id] = player
        }
      }
    })

    return players
  }

  calculateLeaderboard() {
    const users = this.getPlayerList()

    if (users.length > 0) {
      users.sort(function(a,b) {
        return b.wins - a.wins
      })

      let topUsers = []

      for (let i = 0; i < Math.min(10, users.length); i++) {
        topUsers.push({
          id: users[i].id,
          name: users[i].getDisplayName(),
          sectorId: users[i].homeSector.id,
          score: users[i].getDayCount()
        })
      }
      // LOG.info("leaderboard: " + JSON.stringify(this.leaderboard) + " topUsers: " + JSON.stringify(topUsers) + " users: " + JSON.stringify(users.length))
      if (this.leaderboard.length !== topUsers.length) {
        this.leaderboard = topUsers
        this.leaderboardChanged = true
        // LOG.info("leaderboard changed: " + this.leaderboard)
      }
      else {
        for (let i = 0; i < this.leaderboard.length; i++) {
          if (this.leaderboard[i].id !== topUsers[i].id ||
            this.leaderboard[i].name !== topUsers[i].name ||
            this.leaderboard[i].score !== topUsers[i].score ||
            this.leaderboard[i].sectorId !== topUsers[i].sectorId) {
              this.leaderboard = topUsers
              this.leaderboardChanged = true
              // LOG.info("leaderboard changed: " + this.leaderboard)
              break
          }
        }
      }
    }
  }

}

module.exports = Game
