global.env = process.env.NODE_ENV || 'development'
global.pid = process.pid

if (require("os").hostname().match("kube-node")) {
  env = "vm"
}

global.require = require


require("./util/polyfill")

const path = require('path')
const net = require('net')
const http = require("http")
const https = require("https")
const express = require("express")
const bodyParser = require('body-parser')
const uws = require('uWebSockets.js')
const WebSocket = require('ws')
const cors = require('cors')
const fs = require("fs")
const getPort = require('get-port')
const dns = require("dns")
const Sentry = require('@sentry/node')
const promClient = require('prom-client')
const Polyglot = require('node-polyglot')
const englishTranslationMap = require('../common/translations/en')
const japaneseTranslationMap = require('../common/translations/ja')
const russianTranslationMap = require('../common/translations/ru')
const SectorModel = require("junon-common/db/sector")
const ObjectPool = require("../common/entities/object_pool")
const TileHit = require("./entities/tile_hit")
const User = require("junon-common/db/user")
const IpBan = require("junon-common/db/ip_ban")
const Favorite = require("junon-common/db/favorite")
const sequelize = require("junon-common/db/sequelize")
const Item = require("./entities/item")
const base64id = require('base64id')

global.i18n = {
  init() {
    this.instances = {}
    this.instances["en"] = new Polyglot({ phrases: englishTranslationMap, allowMissing: true })
    this.instances["ja"] = new Polyglot({ phrases: japaneseTranslationMap, allowMissing: true })
    this.instances["ru"] = new Polyglot({ phrases: russianTranslationMap, allowMissing: true })
  },
  hasLanguage(language) {
    return this.instances[language]
  },
  t(language, key, options) {
    if (!this.hasLanguage(language)) language = 'en'

    return this.instances[language].t(key, options)
  }
}

global.i18n.init()

global.appRoot = path.resolve(__dirname + '/../')

debugMode = (env === 'development' || env === 'test') ? true : false

if (debugMode) {
  let nodeModulesPath = require('child_process').execSync("npm root").toString().replace("\n","")
  let protocolDirectory = nodeModulesPath + "/junon-common/protocol"
  let protocolContents        = require('child_process').execSync(`cat ${protocolDirectory}/enum.proto ${protocolDirectory}/base.proto ${protocolDirectory}/app.proto`).toString()
  global.protocolHash = require('crypto').createHash('md5').update(protocolContents).digest("hex").substring(0,8)
}

const Protocol = require("../common/util/protocol")
const Constants = require("../common/constants.json")
const Config = require("junon-common/config")
const SocketUtil = require("junon-common/socket_util")
const GameLoop = require("./util/game_loop")
const Game = require("./entities/game")
const ExceptionReporter = require("junon-common/exception_reporter")
const LOG = require('junon-common/logger')
const Helper = require('../common/helper')
const Profiler = require('../common/profiler')
const RemoteEventHandler = require('./entities/remote_event_handler')
const FirebaseAdminHelper = require("./util/firebase_admin_helper")
const WorldSerializer = require("junon-common/world_serializer")
const EventBus = require("eventbusjs")


class Server {
  constructor() {
    this.games = {}
    this.reservedSpots = {}
    this.stats = {}
    this.lastQueueIndex = {}
    this.lastAutoSaveTime = Date.now()
    this.lastSaveTime = Date.now()
    this.sectorLoadQueue = []
    this.sectorSaveQueue = []
  }

  getFirebase() {
    return FirebaseAdminHelper
  }

  getEventBus() {
    return EventBus
  }

  determineDebugPort() {
    if (debugMode) return

    try {
      let result = require('child_process').execSync(`lsof -p ${process.pid} | grep LISTEN`).toString()
      this.debugPort = result.match(/localhost:(\d+)/)[1]
    } catch(e) {
      ExceptionReporter.captureException(e)
    }
  }

  async allocatePort() {
    if (debugMode) {
      this.APP_SERVER_PORT = process.env.PORT || 8000
    } else {
      let availablePort = await FirebaseAdminHelper.claimFreePort(this.getNodeName())
      this.APP_SERVER_PORT = await getPort({host: '0.0.0.0', port: availablePort })
    }
  }

  async run() {
    this.fetchServerInfo()

    if (!this.REGION) {
      LOG.error("REGION is not defined. missing node label. Unable to run gameserver.")
      return
    }

    if (env !== 'development') {
      try {
        let dnsEntry = await dns.promises.lookup('google.com')
        if (!dnsEntry) {
          LOG.error("DNS service not working. Unable to resolve google.com")
          return
        }
      } catch(e) {
        LOG.error("DNS service not working. Unable to resolve google.com")
        return
      }
    }

    await this.initProtocol()
    await WorldSerializer.initSerializer()

    FirebaseAdminHelper.init()
    FirebaseAdminHelper.setRegion(this.getRegion())

    this.determineDebugPort()

    await this.initConstants()

    this.assignServerIp()
    await this.allocatePort()

    if (!debugMode) {
      this.systemdIndex = this.getSystemdServiceIndex()
    }

    this.initPrometheus()

    // must be called after server ip/port allocated
    this.initExceptionReporter()

    await this.initMatchmakerClient()

    this.initRemoteEventHandler()


    this.initWebsocketServer()
    this.sendServerInfoToMatchmaker()

    this.initObjectPools()

    if (this.onServerReadyListener) this.onServerReadyListener()

    FirebaseAdminHelper.sendServerData(this.getFirebaseServerKey(), this.getServerData())
    FirebaseAdminHelper.registerServerToNode(this.getNodeName(), this.getFirebaseServerKey())

    if (!debugMode) {
      await this.initLivenessProbeServer()
    }

    if (debugMode) {
      await this.initDevelopmentAppServer()
    }

  }

  initObjectPools() {
    ObjectPool.create("TileHit", TileHit)
  }

  getObjectPoolInstance() {
    return ObjectPool
  }

  static getItemKlassByName(klassName) {
    return Item.getKlassByName(klassName)
  }

  initPrometheus() {
    promClient.register.setDefaultLabels({
      sid: this.systemdIndex
    })

    promClient.collectDefaultMetrics()

    this.playerCountGauge = new promClient.Gauge({
      name: 'process_player_count',
      help: 'num of players'
    })

    this.gameCountGauge = new promClient.Gauge({
      name: 'process_game_count',
      help: 'num of games'
    })
  }

  initExceptionReporter() {
    ExceptionReporter.init(process.env["JUNON_SERVER_SENTRY_DSN"])

    Sentry.configureScope(scope => {
      scope.setExtra('host', this.getHost())
    })
  }

  getSystemdServiceIndex() {
    let systemctlStatus = require('child_process').execSync(`systemctl status ${process.pid}`).toString()
    let index = systemctlStatus.match(/junon-io@(\d+).service/)[1]
    return index
  }

  initLivenessProbeServer() {
    this.livenessServer = net.createServer((socket) => {
      socket.end('pong\n')
    })

    let unixSocket
    if (debugMode) {
      unixSocket = process.env.HOME + "/liveness_probe"
    } else {
      unixSocket = "/var/run/liveness_probe_" + this.systemdIndex
    }

    if (fs.existsSync(unixSocket)) {
      fs.unlinkSync(unixSocket)
    }
    this.livenessServer.listen(unixSocket, () => {
      console.log('listening on ' + unixSocket)
    })
  }

  generateSectorIdName() {
    let randomNumber =  Math.random().toString().slice(2)
    return {
      id: base64id.generateId(),
      name: "Sector " + randomNumber
    }
  }

  fetchServerInfo() {
    this.REGION = process.env.REGION || "localhost"
    if (debugMode) {
      this.gameRevision = require('child_process').execSync('git rev-parse --short=7 HEAD').toString().trim()
    } else {
      this.gameRevision = require('fs').readFileSync(appRoot + '/revision.txt', 'utf8').trim()
    }
    this.gameVersion = require('fs').readFileSync(appRoot + '/VERSION.txt', 'utf8')
                         .replace(".alpha","").trim()
  }

  addSectorLoadQueue(sector, metadata, entities) {
    this.sectorLoadQueue.push({
      sector: sector,
      metadata: metadata,
      entities: entities
    })
  }

  addSectorSaveQueue(gameId) {
    this.sectorSaveQueue.push(gameId)
  }

  removeSectorLoadQueue(sector) {
    let index = this.sectorLoadQueue.findIndex((loadQueue) => {
      return loadQueue.sector.getId() === sector.getId()
    })

    if (index !== -1) {
      this.sectorLoadQueue.splice(index, 1)
    }
  }

  processSectorLoadQueue() {
    if (this.sectorLoadQueue.length === 0) return

    let loadQueue = this.sectorLoadQueue[0]
    let isFinished = loadQueue.sector.sectorLoader.applySectorData(loadQueue.metadata, loadQueue.entities)
    if (isFinished) {
      this.removeSectorLoadQueue(loadQueue.sector)
    }
  }

  processSectorSaveQueue() {
    if (this.sectorSaveQueue.length === 0) return

    // 1 sec interval
    if (Date.now() - this.lastSaveTime < (1 * 1000)) return

    let gameId = this.sectorSaveQueue.shift()
    let game = this.games[gameId]
    if (!game) return

    try {
      game.saveWorld()
    } catch(e) {
      ExceptionReporter.captureException(e)
    }

    this.lastSaveTime = Date.now()
  }

  assignServerIp() {
    if (env === 'development') {
      this.SERVER_IP = '127.0.0.1'
    } else {
      this.SERVER_IP = process.env.IP_ADDRESS
    }
  }


  ipToDomain(region, ip) {
    return this.ipToSubdomain(region, ip) + ".junon.io"
  }

  ipToSubdomain(region, ip) {
    let hexIp = ip.split(".").map((num) => {
      let hex = parseInt(num).toString(16)
      return hex.length === 1 ? "0" + hex : hex
    }).join("")

    let namespace = this.getNamespace()

    return [namespace,region,hexIp].join("-")
  }

  getNamespace() {
    // prime servers are cheaper ovh servers with
    // lots 8 cores/16 threads + 64gb memory ($100 CAD/month)
    // can host 320 players??
    if (process.env.PRIME) return "prime"
    if (process.env.MINIGAME) return "mini"

    return "game"
  }

  getEnvironment() {
    return process.env["NODE_ENV"]
  }

  getHost() {
    let ip = this.SERVER_IP
    let port = this.APP_SERVER_PORT

    let environment = this.getEnvironment()

    if (["staging", "production"].indexOf(environment) !== -1) {
      let domain = this.ipToDomain(this.getRegion(), ip)
      return [domain,port].join(":")
    } else if (env === 'development') {
      return ["dev.junon.io",port].join(":")
    } else {
      return [ip,port].join(":")
    }
  }

  getHostName() {
    let host = this.getHost().replace(".junon.io", "")
    return host.split(":")[0]
  }

  memsize(obj) {
    return Helper.roughSizeOfObject(obj)
  }

  getRegion() {
    return this.REGION
  }

  getVersion() {
    return this.gameVersion
  }

  getRevision() {
    return this.gameRevision
  }

  sendServerInfoToMatchmaker() {
    if (env === 'test') return

    this.sendToMatchmaker({ event: "ServerUpdated", data: this.getServerData() })
  }

  getServerData() {
    let data = {
      env: this.getEnvironment(),
      region: this.getRegion(),
      host: this.getHost(),
      version: this.getVersion(),
      revision: this.getRevision(),
      memory: this.getMemoryUsageInMB(),
      playerCount: this.getPlayerCount(),
    }

    if (this.systemdIndex) {
      data.systemdIndex = this.systemdIndex
    }

    if (this.debugPort) {
      data.debugPort = this.debugPort
    }

    if (this.isTroubleshooting) {
      data.isTroubleshooting = true
    }

    return data
  }

  getPlayerCount() {
    let total = 0

    this.forEachGame((game) => {
      total += game.getPlayerCount()
    })

    return total
  }

  toggleStatusInMatchmaker() {
//     let data = this.game.getSectorData()
//
//     this.isHidden = !this.isHidden
//     data.status = this.isHidden ? "hidden" : null
//
//     this.sendToMatchmaker({ event: "ServerStatus", data: data  })
//
//     return data.status ? data.status : "shown"
  }

  increaseMemoryUsage() {
    this.lastForceLeakIndex = this.lastForceLeakIndex || 0
    this.forceLeak = this.forceLeak || {}

    let iterations = 1000000
    for (let i = this.lastForceLeakIndex; i < this.lastForceLeakIndex + iterations; i++) {
      this.forceLeak[i] = "shit man" + i
    }

    this.lastForceLeakIndex = this.lastForceLeakIndex + iterations

    this.lastMemoryReportTime = Date.now() - (15000 * 60) // force send new memory to firebase
  }

  get profiler() {
    return Profiler
  }

  async createTutorialGame(sectorId, options) {
    let game = new Game(this, { id: sectorId, isTutorial: true })

    Profiler.start("createGame - game.init")
    await game.init()
    Profiler.stop("createGame - game.init")

    if (!game.sector) {
      return { error: "Error in game create" }
    }

    this.addGame(game)
    return { createdGame: game }
  }

  async createMiniGame(sectorId, options) {
    let key = Math.random().toString(36).substring(6)

    if (options.targetMiniGameId) {
      options.sectorData.id = options.targetMiniGameId
    } else {
      options.sectorData.id = `mini-${sectorId}-${key}`
    }

    let game = new Game(this, options.sectorData)
    if (options.creatorUid) {
      game.setCreatorUid(options.creatorUid)
    }

    LOG.info("Creating Mini game for " + sectorId)
    await game.init(options)


    if (!game.sector) {
      return { error: "Error in game create" }
    }

    if (options.isPrivate) {
      game.sector.setIsPrivate(true)
    }

    this.addGame(game)

    return { createdGame: game }
  }

  async getUidFromRequest(idToken, uid) {
    if (debugMode) return uid
    return await FirebaseAdminHelper.verifyIdToken(idToken)
  }

  async createNormalGame(sectorId, options) {
    if (this.hasGame(sectorId)) return { error: "game already created" }

    let game = new Game(this, options.sectorData)
    game.setCreatorIp(options.creatorIp)
    game.setCreatorSessionId(options.sessionId)

    if (env !== 'test') {
      Profiler.start("createGame - hasCloudSavedData")
      let hasSaveData = await WorldSerializer.hasCloudSavedData(sectorId)
      Profiler.stop("createGame - hasCloudSavedData")

      if (hasSaveData) {
        let version = await WorldSerializer.getSaveFileVersion(game.getSectorUid())
        if (!version) {
          return { error: "Failed to download save file." }
        } else if (version < 3) {
          return { error: "Save file version no longer supported. Post-alpha, saves will be backwards compatibility." }
        }
      }
    }

    if (options.creatorUid) {
      game.setCreatorUid(options.creatorUid)
    } else if (options.idToken) {
      let uid = await this.getUidFromRequest(options.idToken, options.uid)
      if (uid) {
        game.setCreatorUid(uid)
      }
    }

    LOG.info("Creating game for " + sectorId)

    Profiler.start("createGame - game.init")
    await game.init(options)
    Profiler.stop("createGame - game.init")

    if (!game.sector) {
      return { error: "Error in game create" }
    }

    this.addGame(game)

    return { createdGame: game }
  }

  async createGame(options = {}) {
    let sectorId = options.sectorData.id

    try {
      if (options.isTutorial) {
        return this.createTutorialGame(sectorId, options)
      } else if (options.isMiniGame) {
        return this.createMiniGame(sectorId, options)
      } else {
        return this.createNormalGame(sectorId, options)
      }

    } catch(e) {
      LOG.error("Failed creating game for " + sectorId)
      LOG.error(e.message)
      ExceptionReporter.captureException(e)
      return { error: "Error in game create" }
    }
  }

  async createTestGame() {
    let result = await this.createGame({
      creatorIp: "127.0.0.1",
      sectorData: { id: "-devSectorId", name: "dev sector" }
    })

    return result.createdGame
  }

  addGame(game) {
    this.games[game.getId()] = game
    this.onGameCountChanged()
  }

  removeGame(game) {
    delete this.games[game.getId()]
    this.onGameCountChanged()
  }

  getGame(sectorId) {
    return this.games[sectorId]
  }

  getProtocol() {
    return this.protocol
  }

  getSocketInstance() {
    return this.socketUtil
  }

  getSentryInstance() {
    return ExceptionReporter.getSentryInstance()
  }

  getDedupeInstance() {
    return ExceptionReporter.getDedupeInstance()
  }

  getExceptionReporter() {
    return ExceptionReporter
  }

  initRemoteEventHandler() {
    this.remoteEventHandler = new RemoteEventHandler(this)
  }

  async initConstants() {
    const framesPerSecond = Constants.physicsTimeStep
    this.PHYSICS_TIMESTEP = (1000 / framesPerSecond)
    this.SEND_UPDATE_TIMESTEP = (1000 / framesPerSecond)
    this.LEADERBOARD_TIMESTEP = 3000
    this.MIN_PLAYERS_PER_GAME = 1

  }

  fetchChangeLogs() {
    let changeLogsDir = appRoot + "/changelogs"
    let changeLogFiles = fs.readdirSync(changeLogsDir)
    let changeLogs = changeLogFiles.map((filename) => {
      let changeLogContent = JSON.parse(fs.readFileSync(path.resolve(changeLogsDir, filename), 'utf8'))
      return changeLogContent
    })

    return changeLogs
  }

  // only for debug mode. production uses s3->cloudlare for client side content
  initDevelopmentAppServer() {
    const app = express()
    app.use(cors())
    app.use(bodyParser.json())
    app.use(express.static(appRoot + "/client/dist"))
    app.use(express.static(appRoot + "/client/"))
    app.set('views', appRoot + '/client')
    app.set('view engine', 'ejs')

    let gameVersion        = fs.readFileSync(appRoot + "/VERSION.txt", 'utf8').replace("\n","")
    let changeLogs         = this.fetchChangeLogs().reverse()

    app.get('/debug/:message', (req, res) => {
      let result = this.getMainGame().runCommand(req.params.message, req.query)
      res.send({ result: result })
    })

    app.get('/__status', (req, res) => {
      res.render('status', {
        nodeEnv: env
      })
    })

    app.get('/:language?', (req, res) => {
      let language = req.params.language || 'en'
      if (!i18n.hasLanguage(language)) {
        language = 'en'
      }

      let locals = {
        nodeEnv: env,
        gameVersion: gameVersion,
        revision: this.gameRevision,
        protocolHash: protocolHash,
        changeLogs: changeLogs,
        language: language,
        test_vm: process.env.TEST_VM,
        assetPath: (path) => { return path },
        t: (key, options) => {
          return i18n.t(language, key, options)
        }
      }

      res.render('index', locals)
    })


    this.developmentServer = http.Server(app)
    let devAppServerPort = 8001

    return new Promise((resolve, reject) => {
      this.developmentServer.listen(devAppServerPort, () => {
        console.log("\n\n")
        console.log("Junon.io Webpage available at http://localhost:" + devAppServerPort)
        resolve()
      })
    })
  }

  getMainGame() {
    return Object.values(this.games)[0]
  }

  getPlayerById(playerId) {
    let targetPlayer

    this.forEachGame((game) => {
      let player = game.players[playerId]
      if (player) {
        targetPlayer = player
      }
    })

    return targetPlayer
  }

  async getPlayersByIpOrIdToken(ipAddress, idToken, userUid) {
    let players = []
    let uid = await this.getUidFromRequest(idToken, userUid)

    this.forEachGame((game) => {
      game.forEachPlayer((player) => {
        if (player.getRemoteAddress() === ipAddress ||
            player.getUid() === uid) {
          players.push(player)
        }
      })
    })

    return players
  }

  onReady(listener) {
    this.onServerReadyListener = listener
  }

  initProtocol(cb) {
    return new Promise((resolve, reject) => {
      Protocol.initServer((error, protocol) => {
        if (error) {
          console.log("Unable to load network protocol definition")
          throw error
          return
        }
        this.protocol = protocol
        this.socketUtil = new SocketUtil({ protocol: protocol })
        resolve()
      })
    })
  }

  initMatchmakerClient() {
    if (env === 'test') return

    let url = Config[env].matchmakerGameServerWebsocketUrl

    this.matchmakerClient = new WebSocket(url)

    this.matchmakerClient.on('close', () => {
      if (!this.isRestartCountdownSent) {
        // only reconnect when we are not in process of shutting down
        LOG.error("disconnected from matchmaker. reconnecting..")
        setTimeout(this.initMatchmakerClient.bind(this), 5000)
      }
    })

    this.matchmakerClient.on('error', (err) => {
      if (debugMode) {
        LOG.error("socket error matchmaker")
        console.log(err)
      }
    })

    this.matchmakerClient.onmessage = this.onMatchmakerMessage.bind(this)

    this.matchmakerClient.on('open', () => {
      console.log("GameServer connected to matchmaker via " + url)
      setTimeout(() => {
        this.informMatchmaker()
      }, 3000)
    })
  }

  informMatchmaker() {
    // console.log("[informMatchmaker] socket.readystate: " + this.matchmakerClient.readyState)
    this.sendServerInfoToMatchmaker()
    this.forEachGame((game) => {
      // console.log("[informMatchmaker] game: " + game.getSectorUid())
      game.sendSectorInfoToMatchmaker()
    })
  }

  restartServer(data) {
    if (data.isDelayed) {
      this.sendServerRestartCountdown(data.reason, data.seconds)
    } else {
      this.shouldRestart = true
    }
  }

  onCanPlayerJoinResponse(data) {
    let game = this.games[data.gameId]
    if (!game) return

    game.onCanPlayerJoinResponse(data.requestId, data.canJoin)
  }

  restartOnZeroGames() {
    if (!this.shouldRestart) return
    if (this.getGameCount() > 0) return
    if (this.disableRestart) return

    // make sure games finish saving before shutting down
    console.log("Restarting. shutting down..")
    process.exit(0)
  }

  async removePlayerFromMatchmaker(data) {
    if (data.playerTag) {
      this.removePlayerLegacy(data)
    } else {
      let playersToRemove = await this.getPlayersByIpOrIdToken(data.ipAddress, data.idToken, data.uid)
      playersToRemove.forEach((player) => {
        let duration = player.getSessionDuration()
        LOG.info(player.name + " removePlayerFromMatchmaker. session duration: " + Helper.stringifyTimeShort(duration))
        player.remove()
      })
    }
  }

  removePlayerLegacy(data) {
    let game = this.games[data.sectorId]
    if (!game) return

    let player = game.findPlayerWithTag(data.playerTag)
    if (!player) return

    LOG.info(player.name + " left game. session duration: " + Helper.stringifyTimeShort(player.getSessionDuration()))

    player.remove()
  }

  async findSectorWithAttributers(sectorId) {
    return await SectorModel.findOne({
      attributes: ['uid', 'name', 'daysAlive', 'creatorUid', 'screenshot', 'gameMode', 'isPrivate', 'upvoteCount', 'downvoteCount', 'rating', 'createdAt',
                   [sequelize.fn('COUNT', 'favorites.id'), 'favoriteCount']],
      where: { uid: sectorId },
      include: [
        { model: User, as: 'creator' },
        { model: Favorite, as: 'favorites', attributes: [], required:false }
      ]
    })

//       let query = "select *, COUNT(favorites.sectorUid) as favoriteCount from sectors " +
//                   "left join users on users.uid = sectors.creatorUid " +
//                   "left join favorites on favorites.sectorUid = sectors.uid " +
//                   "where sectors.uid = '" + sectorId + "' " +
//                   "group by sectors.uid"
//
//
//       const sectors = await sequelize.query(query, {
//         model: SectorModel,
//         mapToModel: true // pass true here if you have any mapped fields
//       })
//
//       const sectorModel = sectors[0]

  }

  async createGameFromMatchmaker(data) {
    let sectorId = data.sectorId
    if (!sectorId) return

    let result = {}

    if (data.isTutorial) {
      result = await this.createGame({
        creatorIp: data.creatorIp,
        sectorData: { id: sectorId },
        isTutorial: true,
        gameMode: null
      })
    } else {
      const sectorModel = await this.findSectorWithAttributers(sectorId)
      if (sectorModel) {
        result = await this.createGame({
          isBootSector: data.isBootSector,
          isMiniGame: data.isMiniGame,
          sessionId: data.sessionId,
          creatorIp: data.creatorIp,
          creatorUid: sectorModel.creatorUid,
          sectorData: { id: sectorId, name: sectorModel.name, sectorModel: sectorModel, origSectorUid: sectorModel.dataValues.uid },
          gameMode: data.gameMode || sectorModel.gameMode,
          rowCount: parseInt(data.rowCount),
          colCount: parseInt(data.colCount),
          isPrivate: data.isPrivate,
          targetMiniGameId: data.targetMiniGameId,
          language: data.language
        })
      } else {
        LOG.error(sectorId + " not found in firebase /sectors. CreateGame failed.")
        result.error = "Save file not on registry"
      }
    }

    let success = !!(result && result.createdGame)
    let error = result && result.error

    let resultData = {
      socketId: data.socketId,
      host: this.getHost(),
      isBootSector: data.isBootSector,
      isMiniGame: data.isMiniGame,
      gameMode: data.gameMode,
      success: success,
      error: error,
      requestId: data.requestId
    }

    if (success) {
      resultData.sectorId = result.createdGame.sectorUid
      resultData.sector = result.createdGame.getSectorData()
      resultData.sector.id = resultData.sector.sectorId
      resultData.isGameReady = true
      result.createdGame.onGameReady(() => {
        this.sendToMatchmaker({
          event: "GameCreateStatus",
          data: resultData
        })
      })
    } else {
      this.sendToMatchmaker({
        event: "GameCreateStatus",
        data: resultData
      })
    }
  }

  async onMatchmakerMessage(event) {
    try {
      let message = JSON.parse(event.data)
      let data = message.data

      switch(message.event) {
        case "CreateGame":
          this.createGameFromMatchmaker(data)
          break
        case "RemovePlayer":
          this.removePlayerFromMatchmaker(data)
          break
        case "Restart":
          this.restartServer(data)
          break
        case "CanPlayerJoinResponse":
          this.onCanPlayerJoinResponse(data)
          break
        default:
      }
    } catch(e) {
      ExceptionReporter.captureException(e)
    }
  }

  getNodeName() {
    return this.getHostName()
  }

  getFirebaseServerKey() {
    return this.getHost().replace(".junon.io", "")
  }

  onGameCountChanged() {
    let count = this.getGameCount()
    this.gameCountGauge.set(count)
  }

  onPlayerCountChanged() {
    let count = this.getPlayerCount()
    this.playerCountGauge.set(count)
    this.sendServerInfoToMatchmaker()
    FirebaseAdminHelper.sendServerPlayerCount(this.getFirebaseServerKey(), count)
  }

  forEachGame(cb) {
    for (let gameId in this.games) {
      cb(this.games[gameId])
    }
  }

  hasGame(gameId) {
    return this.games[gameId]
  }

  getGameCount() {
    return Object.keys(this.games).length
  }

  isShutdownInProgress() {
    return this.isRestartCountdownSent
  }

  sendServerRestartCountdown(reason, seconds) {
    if (this.isRestartCountdownSent) return

    this.forEachGame((game) => {
      game.sendServerRestartCountdown(reason, seconds)
    })

    this.isRestartCountdownSent = true
  }

  getMatchmakerSocket() {
    return this.matchmakerClient
  }

  sendToMatchmaker(data) {
    if (env === 'test') return

    let socket = this.getMatchmakerSocket()
    if (socket.readyState !== WebSocket.OPEN) return

    const message = JSON.stringify(data)
    socket.send(message)
  }

  initWebsocketServer() {

    // register events
    for (let eventName in Protocol.definition().MessageWrapper.fields) {
      this.socketUtil.on(eventName, this.onSocketMessage.bind(this, eventName))
    }

    let app
    if (debugMode) {
      app = uws.App()
    } else {
      app = uws.SSLApp({
        key_file_name:  "/var/secrets/ssl/tls.key",
        cert_file_name: "/var/secrets/ssl/tls.crt"
      })
    }

    app.ws("/*", {
      maxPayloadLength: 16 * 1024 * 1024,
      idleTimeout: 120,
      open: (ws, req) => {
        this.socketUtil.registerSocket(ws)
      },
      message: (ws, message, isBinary) => {
        if (isBinary) {
          this.socketUtil.onMessage(ws, message)
        } else {
          this.socketUtil.onTextMessage(ws, message)
        }
      },
      close: (ws, code, message) => {
        ws.isClosed = true
        this.socketUtil.unregisterSocket(ws)
        this.onClientDisconnect(ws)
      }
    })

    app.get('/ping', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')
      res.writeHeader('Content-Type','text/plain')
      res.end('pong')
    })

    app.get('/join', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')
      let ip = Helper.getSocketRemoteAddress(res)
      let isSuccess = this.reserveSpot(ip)
      res.end(JSON.stringify({ success: isSuccess }))
    })

    app.get('/metrics', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')
      res.writeHeader('Content-Type', promClient.register.contentType)
      res.end(promClient.register.metrics())
    })

    app.post('/toggle', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')
      let token = "aGlkZGVu"

      this.readJson(res, (body) => {
        if (body.token !== token) return

        let result = this.toggleStatusInMatchmaker()

        res.end(result)
      })
    })

    app.listen(this.APP_SERVER_PORT, (token) => {
      if (token) {
        console.log('Junon Gameserver listening to port ' + this.APP_SERVER_PORT)
      } else {
        console.log('Gameserver failed to listen to port ' + this.APP_SERVER_PORT)
      }
    })

    this.gameLoopHelper = new GameLoop()
    setInterval(this.mainLoop.bind(this), this.PHYSICS_TIMESTEP)
    setInterval(this.scoreLoop.bind(this), this.LEADERBOARD_TIMESTEP)
  }

  readJson(res, cb, err) {
    let buffer;
    /* Register data cb */
    res.onData((ab, isLast) => {
      let chunk = Buffer.from(ab);
      if (isLast) {
        let json;
        if (buffer) {
          try {
            json = JSON.parse(Buffer.concat([buffer, chunk]));
          } catch (e) {
            /* res.close calls onAborted */
            res.close();
            return;
          }
          cb(json);
        } else {
          try {
            json = JSON.parse(chunk);
          } catch (e) {
            /* res.close calls onAborted */
            res.close();
            return;
          }
          cb(json);
        }
      } else {
        if (buffer) {
          buffer = Buffer.concat([buffer, chunk]);
        } else {
          buffer = Buffer.concat([chunk]);
        }
      }
    });

    /* Register error cb */
    res.onAborted(err);
  }

  reserveSpot(ip) {
    if (this.isShutdownInProgress()) return false

    this.reservedSpots[ip] = { ip: ip, timestamp: Date.now() }

    return true
  }

  hasReservedSpot(ip) {
    return this.reservedSpots[ip]
  }

  removeReservedSpot(ip) {
    delete this.reservedSpots[ip]
  }

  getNumReservedSpots() {
    return Object.keys(this.reservedSpots).length
  }

  mainLoop() {
    this.beginMeasure("tick")

    for (let gameId in this.games) {
      let game = this.games[gameId]

      try {
        game.recordClock()
        game.stepWorld()
        game.sendUpdates()
        game.shutdownOnZeroPlayers()
        game.removeOnForced()
      } catch (e) {
        ExceptionReporter.captureException(e)
      }
    }

    this.processQueues()
    this.processSectorLoadQueue()
    this.processSectorSaveQueue()
    this.autoSaveWorlds()
    this.shutdownStaleGames()

    this.endMeasure("tick")

    this.reportPerformance()
    this.sendServerHeartbeat()
    this.sendServerMemoryUsage()

    this.restartOnZeroGames()
  }

  shutdownStaleGames() {
    if (debugMode) return
    if (Date.now() - this.lastStaleCheckTime < (2 * 60 * 1000)) return

    for (let gameId in this.games) {
      let game = this.games[gameId]
      if (game.isStale()) {
        game.remove()
      }
    }

    this.lastStaleCheckTime = Date.now()
  }

  async autoSaveWorlds() {
    if (debugMode) return
    if (Date.now() - this.lastAutoSaveTime < (3 * 60 * 1000)) return

    for (let gameId in this.games) {
      let game = this.games[gameId]
      if (game.canBeSaved()) {
        this.addSectorSaveQueue(gameId)
      }
    }

    this.lastAutoSaveTime = Date.now()
  }

  processQueues() {
    let queues = [
      { name: "mobTaskQueue", limit: 10, elapsed: 0 } //ms
    ]

    let gameIds = Object.keys(this.games)

    for (var i = 0; i < queues.length; i++) {
      let queue = queues[i]
      while (this.getQueueLength(queue, gameIds) > 0 &&
             queue.elapsed < queue.limit) {
        this.processQueue(queue, gameIds)
      }
    }

  }

  getQueueLength(queue, gameIds) {
    let result = 0

    for (var i = 0; i < gameIds.length; i++) {
      let gameId = gameIds[i]
      let game = this.games[gameId]
      let sectorQueue = game && game.sector && game.sector[queue.name]
      if (sectorQueue) {
        result += sectorQueue.getQueue().length
      }
    }

    return result
  }

  isBanExpired(ban) {
    if (ban.dayCount) {
      console.log("ban createdAt : " + ban.createdAt)
      let microSeconds = ban.dayCount * 24 * 60 * 60 * 1000
      if (ban.createdAt <  (Date.now() - microSeconds)) {
        // past expiry
        return true
      }
    }

    return false
  }

  removeBan(condition) {
    IpBan.destroy({ where: condition })
  }

  async getBanSets() {
    if (!this.lastIpBanCacheTime ||
         Date.now() - this.lastIpBanCacheTime > (60 * 1000)) {
      let ipBanList = await IpBan.findAll({ attributes: ['ip', 'username', 'reason', 'dayCount', 'createdAt'] })
      this.lastIpBanCacheTime = Date.now()
      this.ipBanSet   = {}
      this.userBanSet = {}
      for (var i = 0; i < ipBanList.length; i++) {
        this.ipBanSet[ipBanList[i].ip] = ipBanList[i]
        if (ipBanList[i].username) {
          this.userBanSet[ipBanList[i].username.toLowerCase()] = ipBanList[i]
        }
      }
    }

    return { ipBanSet: this.ipBanSet, userBanSet: this.userBanSet  }
  }

  processQueue(queue, gameIds) {
    try {
      this.lastQueueIndex[queue.name] = this.lastQueueIndex[queue.name] || 0

      let gameIndex = this.lastQueueIndex[queue.name]
      let gameId = gameIds[gameIndex]
      let game = this.games[gameId]
      if (game && game.sector) {
        let queueObject = game.sector[queue.name]
        if (queueObject && queueObject.getQueue().length > 0) {
          let elapsed = game.sector[queue.name].executeTurn()
          queue.elapsed += elapsed
        }
      }
    } catch(e) {
      ExceptionReporter.captureException(e)
    }

    this.lastQueueIndex[queue.name] += 1
    if (this.lastQueueIndex[queue.name] >= gameIds.length) {
      // back to beginning
      this.lastQueueIndex[queue.name] = 0
    }
  }

  beginMeasure(stat) {
    this.getStat(stat).startTime = process.hrtime()
  }

  endMeasure(stat) {
    let duration = process.hrtime(this.getStat(stat).startTime)
    let milliseconds = duration[0] * 1000 + (duration[1] / 1000000)
    this.getStat(stat).duration = Math.round(milliseconds * 10) / 10

    let isOneSecond = this.getStat(stat).count === 10
    if (isOneSecond) {
      this.getStat(stat).maxDuration = 0  // reset max every second
      this.getStat(stat).count = 0
    }

    this.getStat(stat).maxDuration = this.getStat(stat).maxDuration || 0
    this.getStat(stat).maxDuration = Math.max(this.getStat(stat).duration, this.getStat(stat).maxDuration)
    this.getStat(stat).count = this.getStat(stat).count || 0
    this.getStat(stat).count += 1
  }

  sendServerHeartbeat() {
    let isOneMinute = (Date.now() - this.lastHeartBeatTime) > (1000 * 60)
    let shouldSendHeartbeat = !this.lastHeartBeatTime || isOneMinute
    if (shouldSendHeartbeat) {
      // to keep ws connection alive
      this.sendToMatchmaker({ event: "Heartbeat", data: this.getServerData() })
      this.lastHeartBeatTime = Date.now()


      this.forEachGame((game) => {
        game.sendSectorInfoToMatchmaker()
      })
    }
  }

  sendServerMemoryUsage() {
    if (debugMode) return

    let isFiveMinute = (Date.now() - this.lastMemoryReportTime) > (5000 * 60)
    let shouldSendMemUsage = !this.lastMemoryReportTime || isFiveMinute
    if (shouldSendMemUsage) {
      FirebaseAdminHelper.sendServerMemoryUsage(this.getFirebaseServerKey(), this.getMemoryUsageInMB())
      this.lastMemoryReportTime = Date.now()
    }
  }

  getMemoryUsageInMB() {
    let memoryUsage = process.memoryUsage().rss
    return Math.round(memoryUsage / 1000000)
  }

  reportPerformance() {
    let threeSecond = 3000
    let canCheckMemory = !this.lastMemoryCheckTime || (Date.now() - this.lastMemoryCheckTime > threeSecond)
    if (!canCheckMemory) return

    this.reportLatencyPerformance()
    this.reportMemoryPerformance()

    this.lastMemoryCheckTime = Date.now()
  }

  reportLatencyPerformance() {
    let tickDuration = this.getStat("tick").maxDuration
    if (tickDuration > 80) {
      this.tickHighCount += 1
      let seconds = 10 // 30 seconds due to above interval check
      let highTickDurationThreshold = seconds
      if (this.tickHighCount > highTickDurationThreshold && !this.isLatencyErrorReported) {
        this.isLatencyErrorReported = true
        // ExceptionReporter.captureException(new Error("high tick duration"))
      }
    } else {
      this.tickHighCount = 0
    }
  }


  reportMemoryPerformance() {

    this.getStat("memory").usage = this.getMemoryUsageInMB()

    let memoryThreshold = 1000
    if (this.getStat("memory").usage > memoryThreshold) {
      this.memoryHighCount += 1
      let seconds = 10 // 30 seconds due to above interval check
      let highMemoryThreshold = seconds
      if (this.memoryHighCount > highMemoryThreshold && !this.isMemoryErrorReported) {
        this.isMemoryErrorReported = true
        ExceptionReporter.captureException(new Error("high memory"))
      }
    } else {
      this.memoryHighCount = 0
    }
  }

  getStat(stat) {
    if (!this.stats[stat]) {
      this.stats[stat] = {}
    }

    return this.stats[stat]
  }

  getAvailableGame() {
    let result

    for (let gameId in this.games) {
      let game = this.games[gameId]
      if (!game.isFull()) {
        result = game
        break
      }
    }

    return result
  }

  onSocketMessage(eventName, data, socket) {
    this.remoteEventHandler.onSocketMessage(eventName, data, socket)
  }

  onClientDisconnect(socket) {
    this.remoteEventHandler.onClientDisconnect(socket)
  }

  scoreLoop() {
    this.cleanupReservedSpots()
  }

  isServerFull(socket) {
    let ip = Helper.getSocketRemoteAddress(socket)
    if (this.hasReservedSpot(ip)) return false

    let totalCount = this.getPlayerCount() + this.getNumReservedSpots()
    return totalCount >= 40
  }

  cleanupReservedSpots() {
    let lastCleanupMoreThanFiveSeconds = this.lastCleanupCheck && (Date.now() - this.lastCleanupCheck) > 5000
    let shouldPerformCleanup = !this.lastCleanupCheck || lastCleanupMoreThanFiveSeconds
    if (shouldPerformCleanup) {
      try {
        for (let ip in this.reservedSpots) {
          let spot = this.reservedSpots[ip]
          let isSpotExpired = Date.now() - spot.timestamp > 5000
          if (isSpotExpired) {
            delete this.reservedSpots[ip]
          }
        }
      } catch(e) {
        ExceptionReporter.captureException(e)
      }

      this.lastCleanupCheck = Date.now()
    }
  }

}

let isCalledDirectly = require.main === module
if (isCalledDirectly) {
  if (debugMode) {
    require("dns").lookup("www.google.com", (err) => {
      if (err) {
        global.isOffline = true
      }

      global.server = new Server()
      global.server.run()
    })
  } else {
    global.server = new Server()
    global.server.run()
  }
}

global.JunonServer = Server

module.exports = Server
