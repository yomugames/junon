require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env'), quiet: true })

global.env = process.env.NODE_ENV || 'development'
global.pid = process.pid

if (require("os").hostname().match("kube-node")) {
  env = "vm"
}

global.require = require


require("./util/polyfill")

const path = require('path')
const net = require('net')
const os = require('os')
const crypto = require('crypto')
const http = require("http")
const https = require("https")
const express = require("express")
const bodyParser = require('body-parser')
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
const syncStandaloneSchema = require("junon-common/db/standalone_schema")
const StandaloneWorlds = require("junon-common/standalone_worlds")
const SaveImporter = require("junon-common/save_importer")
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

// NODE_ENV=standalone is the offline desktop / listen-server runtime: one world
// per process, saved under JUNON_SAVES_DIR, with no matchmaker, MySQL,
// Firebase, S3 or Sentry. Gameplay runs with production settings (debugMode is
// off), so only infrastructure branches check isStandalone.
const isStandalone = env === 'standalone'

// The desktop shell (packages/junon-desktop) runs a standalone server in an
// Electron utility process, which provides process.parentPort. It serves the
// client itself and talks to this process over that port, so no page server.
const isDesktop = isStandalone && !!process.parentPort

// Firebase is an optional production integration. Local runs must not require
// Application Default Credentials just because the machine has network access.
if (isStandalone || (debugMode && process.env.JUNON_USE_FIREBASE !== 'true')) {
  global.isOffline = true
}

// NODE_ENV=test normally isolates the game server from the matchmaker entirely
// (no outbound socket, no heartbeat) so Jest unit tests never open real
// sockets. E2E tests want the opposite: test env's sqlite db / isOffline
// Firebase / fast sector init, but a real matchmaker-routed game creation
// flow. JUNON_E2E_MATCHMAKER opts back into matchmaker communication while
// keeping every other test-env behavior unchanged. Standalone servers never
// have a matchmaker.
global.isMatchmakerDisabled = isStandalone || (env === 'test' && process.env.JUNON_E2E_MATCHMAKER !== 'true')

if (debugMode || isStandalone) {
  // same hash as the client build's (gulpfile.js), read without shelling out
  // to npm/cat, which a packaged desktop app doesn't have
  let protocolDirectory = path.join(path.dirname(require.resolve("junon-common/package.json")), "protocol")
  let protocolContents = ["enum.proto", "base.proto", "app.proto"].map((file) => {
    return fs.readFileSync(path.join(protocolDirectory, file))
  })
  global.protocolHash = require('crypto').createHash('md5').update(Buffer.concat(protocolContents)).digest("hex").substring(0,8)
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
const StandaloneSocketServer = require('./util/standalone_socket_server')
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
    if (debugMode || isStandalone) return

    try {
      let result = require('child_process').execSync(`lsof -p ${process.pid} | grep LISTEN`).toString()
      this.debugPort = result.match(/localhost:(\d+)/)[1]
    } catch(e) {
      ExceptionReporter.captureException(e)
    }
  }

  async allocatePort() {
    if (debugMode || isStandalone) {
      // uws.App#listen() (hosted debug servers) silently fails (falsy token,
      // no error) when given a string port instead of a number -
      // process.env.PORT is always a string, so this must be parsed
      this.APP_SERVER_PORT = parseInt(process.env.PORT) || 8000
    } else {
      let availablePort = await FirebaseAdminHelper.claimFreePort(this.getNodeName())
      this.APP_SERVER_PORT = await getPort({host: '0.0.0.0', port: availablePort })
    }
  }

  async run() {
    if (isStandalone) {
      if (process.env.JUNON_WORLD_ID && !process.env.JUNON_OWNER_UID) {
        LOG.error("JUNON_OWNER_UID is not defined")
        process.exit(1)
      }
      // the sqlite file lives in the saves directory (junon-common/db/config.js)
      fs.mkdirSync(WorldSerializer.getSavesDirectory(), { recursive: true })
      await syncStandaloneSchema(sequelize)
    }

    if (env === 'test') {
      // sqlite :memory: (see junon-common/db/config.js) starts with no schema
      // at all - real MySQL gets its schema from db/migrations, which never
      // runs against the in-memory db, so any real query would 404 on a
      // missing table instead of just returning no rows.
      // sequelize.sync() (global, association-aware) fails here with a
      // "cyclic dependency" toposort error over the sectors<->users FK loop;
      // syncing each already-required model independently sidesteps that
      // since sqlite doesn't enforce FK target existence at CREATE TABLE time
      await Promise.all(Object.values(sequelize.models).map((model) => model.sync()))
    }

    this.fetchServerInfo()

    if (!this.REGION) {
      LOG.error("REGION is not defined. missing node label. Unable to run gameserver.")
      return
    }

    if (env !== 'development' && !isStandalone) {
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

    if (!debugMode && !isStandalone) {
      this.systemdIndex = this.getSystemdServiceIndex()
    }

    this.initPrometheus()

    // must be called after server ip/port allocated
    this.initExceptionReporter()

    await this.initMatchmakerClient()

    this.initRemoteEventHandler()


    await this.initWebsocketServer()
    this.sendServerInfoToMatchmaker()

    this.initObjectPools()

    if (this.onServerReadyListener) this.onServerReadyListener()

    if (!debugMode) {
      FirebaseAdminHelper.sendServerData(this.getFirebaseServerKey(), this.getServerData())
      FirebaseAdminHelper.registerServerToNode(this.getNodeName(), this.getFirebaseServerKey())
    }
    
    if (!debugMode && !isStandalone) {
      await this.initLivenessProbeServer()
    }

    if (debugMode || (isStandalone && !isDesktop)) {
      await this.initDevelopmentAppServer()
    }

    if (isStandalone) {
      this.initStandaloneProcessHandlers()
      if (process.env.JUNON_WORLD_ID) await this.loadStandaloneWorld()
    }

    if (isDesktop) {
      this.initDesktopChannel()
    }

  }

  // The launcher (desktop shell, or a developer running serveronly) picks the
  // world. As on hosted servers, the sectors table is the world registry
  // (there the matchmaker creates the row): it holds the world's name, game
  // mode and owner. A world without a row - new, or a save copied in from the
  // hosted game - is registered from its save header, owned by the launching
  // profile.
  async loadStandaloneWorld(options = {}) {
    let worldId = options.worldId || process.env.JUNON_WORLD_ID
    if (!worldId) {
      throw new Error("JUNON_WORLD_ID is not defined")
    }

    // Required: Team#isSectorOwner compares teams against the world owner, and
    // an unset owner would match every team saved without a creator
    let ownerUid = options.ownerUid || process.env.JUNON_OWNER_UID
    if (!ownerUid) {
      throw new Error("JUNON_OWNER_UID is not defined")
    }

    // worlds imported with server/util/tasks/import_save.js are registered
    // already, owned by the importing profile
    let metadata = await WorldSerializer.getSaveMetadata(worldId)
    await StandaloneWorlds.register({
      uid: worldId,
      name: metadata ? metadata.name : (options.name || process.env.JUNON_WORLD_NAME),
      gameMode: (metadata && metadata.gameMode) || options.gameMode || process.env.JUNON_GAME_MODE,
      ownerUid: ownerUid
    })

    let sectorModel = await this.findSectorWithAttributers(worldId)

    let result = await this.createGame({
      creatorIp: "127.0.0.1",
      creatorUid: sectorModel.creatorUid,
      sectorData: { id: worldId, name: sectorModel.name, sectorModel: sectorModel },
      gameMode: sectorModel.gameMode
    })

    if (!result.createdGame) {
      throw new Error("Unable to load world " + worldId + ": " + result.error)
    }

    // a save's entities are applied over several ticks (processSectorLoadQueue)
    // and joins before that are refused, so the menu may only connect after this
    await new Promise((resolve) => result.createdGame.onGameReady(resolve))

    console.log("Standalone world ready: " + worldId)
  }

  async activateStandaloneWorld(options) {
    let current = this.getMainGame()
    if (current && current.getId() === options.worldId) return
    this.stopHosting("The host closed the world.")
    if (current) await current.prepareRemove()
    await this.loadStandaloneWorld(options)
  }

  initStandaloneProcessHandlers() {
    // hosted servers crash and get restarted by systemd; a player's own world
    // would instead lose everything since the last autosave, so log a failed
    // async handler and keep the world running
    process.on('unhandledRejection', (reason) => {
      ExceptionReporter.captureException(reason instanceof Error ? reason : new Error(String(reason)))
    })

    // save before exiting so closing the game (or Ctrl-C on serveronly)
    // doesn't lose progress since the last autosave
    let shutdown = this.shutdownStandalone = async () => {
      if (this.isStandaloneShutdownInProgress) return
      this.isStandaloneShutdownInProgress = true

      // guests leave first, so their characters are stored before the save
      this.stopHosting("The host closed the world.")

      let exitCode = 0
      let games = Object.values(this.games)
      for (let i = 0; i < games.length; i++) {
        try {
          await games[i].prepareRemove()
        } catch(e) {
          // still exit - e.g. a world stopped mid-load has nothing to save
          ExceptionReporter.captureException(e)
          exitCode = 1
        }
      }

      process.exit(exitCode)
    }

    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)
  }

  // Messages from the desktop main process: local menu requests (see
  // getLocalWorldApi) and a save-and-exit request when the app quits, since
  // killing a utility process on Windows skips the SIGTERM handler.
  initDesktopChannel() {
    let api = this.getLocalWorldApi()

    process.parentPort.on('message', async ({ data }) => {
      if (!data) return
      if (data.type === 'shutdown') return this.shutdownStandalone()
      if (data.type !== 'localApi') return

      try {
        if (!Object.prototype.hasOwnProperty.call(api, data.method)) throw new Error('Unknown request')
        let args = Array.isArray(data.args) ? data.args : []
        let result = await api[data.method](...args)
        process.parentPort.postMessage({ type: 'localApiResult', id: data.id, result: result })
      } catch(e) {
        process.parentPort.postMessage({ type: 'localApiResult', id: data.id, error: e.message })
      }
    })

    process.parentPort.postMessage({ type: 'ready', port: this.APP_SERVER_PORT })
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

    Sentry.getCurrentScope().setExtra('host', this.getHost())
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
    this.gameRevision = this.readGameRevision()
    this.gameVersion = require('fs').readFileSync(appRoot + '/VERSION.txt', 'utf8')
                         .replace(".alpha","").trim()
  }

  readGameRevision() {
    try {
      return require('child_process').execSync('git rev-parse --short=7 HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
    } catch(e) {
      // packaged desktop builds have no git checkout; the client build
      // records the revision it was built from
      if (!isStandalone) throw e
      let revisionFile = appRoot + '/dist/revision'
      return fs.existsSync(revisionFile) ? fs.readFileSync(revisionFile, 'utf8').trim() : 'unknown'
    }
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
    } else if (isStandalone) {
      this.SERVER_IP = this.getStandaloneBindHost()
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

  // standalone servers only accept connections from this machine unless the
  // host explicitly opens the world to other players
  getStandaloneBindHost() {
    return process.env.JUNON_HOST || '127.0.0.1'
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
      return ["localhost",port].join(":")
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
    if (global.isMatchmakerDisabled) return

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

  async getUidFromRequest(idToken, uid) {
    if (debugMode || !idToken) return uid
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
    if (!isStandalone) app.use(cors())
    app.use(bodyParser.json())
    app.use(express.static(appRoot + "/client/dist"))
    app.use(express.static(appRoot + "/client/"))
    app.set('views', appRoot + '/client')
    app.set('view engine', 'ejs')

    if (isStandalone) {
      // Browser management is bound to loopback. Reject cross-origin form
      // submissions as well as CORS requests before they can mutate saves.
      app.use('/local', (req, res, next) => {
        let origin = req.get('origin')
        if (!/^((localhost|127\.0\.0\.1):[0-9]+)$/.test(req.get('host') || '')) return res.sendStatus(403)
        if (origin && origin !== `${req.protocol}://${req.get('host')}`) return res.sendStatus(403)
        next()
      })
      const route = (handler) => async (req, res) => {
        try { res.json(await handler(req)) } catch (e) { res.status(400).json({ error: e.message }) }
      }
      const api = this.getLocalWorldApi()
      const raw = express.raw({ type: 'application/octet-stream', limit: '100mb' })
      app.get('/local/worlds', route(() => api.listWorlds()))
      app.post('/local/worlds', route((req) => api.createWorld(req.body)))
      app.post('/local/worlds/open', route((req) => api.openWorld(req.body)))
      app.post('/local/host', route((req) => api.hostWorld(req.body)))
      app.post('/local/host/stop', route(() => api.stopHosting()))
      app.post('/local/import/characters', raw, route((req) => api.listImportCharacters(req.body)))
      app.post('/local/import', raw, route((req) => api.importWorld(req.body, {
        ownerUid: req.get('x-junon-owner'),
        ownerName: req.get('x-junon-name'),
        characterUid: req.get('x-junon-character')
      })))
    }

    let gameVersion        = fs.readFileSync(appRoot + "/VERSION.txt", 'utf8').replace("\n","")
    let changeLogs         = this.fetchChangeLogs().reverse()

    // runs arbitrary game commands unauthenticated - development only
    if (debugMode) {
      app.get('/debug/:message', (req, res) => {
        let result = this.getMainGame().runCommand(req.params.message, req.query)
        res.send({ result: result })
      })
    }

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
    let devAppServerPort = (isStandalone && parseInt(process.env.JUNON_CLIENT_PORT)) || 8001

    // standalone serves the client to this machine only
    let devAppServerHost = isStandalone ? '127.0.0.1' : undefined

    return new Promise((resolve, reject) => {
      this.developmentServer.listen(devAppServerPort, devAppServerHost, () => {
        console.log("\n\n")
        console.log("Junon.io Webpage available at http://localhost:" + devAppServerPort)
        resolve()
      })
    })
  }

  // World management for the standalone local menu. A browser reaches it
  // through the loopback /local/* routes, the desktop shell through its parent
  // port (initDesktopChannel). Arguments come from the client: validate them.
  getLocalWorldApi() {
    const validOwner = (uid) => typeof uid === 'string' && /^[a-f0-9]{32}$/i.test(uid)
    const validWorld = (uid) => typeof uid === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(uid)
    const validSave = (bytes) => {
      if (!(bytes instanceof Uint8Array)) throw new Error('Invalid save file')
      return Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength)
    }
    const serverUrl = () => `ws://127.0.0.1:${this.APP_SERVER_PORT}`
    const validOwnedWorld = async (worldId, ownerUid) => {
      if (!validWorld(worldId) || !validOwner(ownerUid)) throw new Error('Invalid world or profile')
      let row = await SectorModel.findOne({ where: { uid: worldId } })
      if (!row) throw new Error('World not found')
      if (row.creatorUid !== ownerUid) throw new Error('World belongs to another profile')
    }

    return {
      listWorlds: async () => {
        let rows = await SectorModel.findAll({ order: [['updatedAt', 'DESC']] })
        return { worlds: rows.map((row) => ({ id: row.uid, name: row.name, mode: row.gameMode, days: row.daysAlive })), activeWorldId: this.getMainGame() && this.getMainGame().getId(), serverUrl: serverUrl(), hosting: this.getHostingStatus() }
      },
      createWorld: async ({ ownerUid, name, gameMode } = {}) => {
        if (!validOwner(ownerUid) || typeof name !== 'string' || !/^[\p{L}\p{N} _-]{1,40}$/u.test(name.trim()) || !['peaceful', 'survival', 'hardcore'].includes(gameMode)) throw new Error('Invalid world details')
        let worldId = require('crypto').randomBytes(12).toString('hex')
        await this.activateStandaloneWorld({ worldId, ownerUid, name: name.trim(), gameMode })
        return { worldId, serverUrl: serverUrl() }
      },
      openWorld: async ({ worldId, ownerUid } = {}) => {
        await validOwnedWorld(worldId, ownerUid)
        await this.activateStandaloneWorld({ worldId, ownerUid })
        return { worldId, serverUrl: serverUrl() }
      },
      // opens the world (if it isn't already) and lets guests join it
      hostWorld: async ({ worldId, ownerUid, port, password } = {}) => {
        await validOwnedWorld(worldId, ownerUid)
        if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Choose a port between 1024 and 65535')
        if (typeof password !== 'string' || !/^[\x20-\x7e]{0,64}$/.test(password)) throw new Error('Use up to 64 plain characters for the password')
        if (this.getHostingStatus()) throw new Error('Already hosting. Stop hosting first.')
        await this.activateStandaloneWorld({ worldId, ownerUid })
        await this.startHosting({ port, password })
        return { worldId, serverUrl: serverUrl(), hosting: this.getHostingStatus() }
      },
      stopHosting: async () => {
        this.stopHosting("The host stopped hosting the world.")
        return { hosting: null }
      },
      listImportCharacters: async (bytes) => {
        return { characters: SaveImporter.listCharacters(validSave(bytes)) }
      },
      importWorld: async (bytes, { ownerUid, ownerName, characterUid } = {}) => {
        if (!validOwner(ownerUid) || !/^[a-zA-Z0-9_]{1,16}$/.test(ownerName || '')) throw new Error('Invalid profile')
        let result = SaveImporter.importSave(validSave(bytes), { ownerUid, ownerName, characterUid: characterUid || null })
        let savePath = WorldSerializer.getSectorSavePath(result.worldId)
        await WorldSerializer.writeToSavesDirectory(savePath, result.compressed)
        await StandaloneWorlds.register({ uid: result.worldId, name: result.name, gameMode: result.gameMode, ownerUid })
        return { worldId: result.worldId, name: result.name }
      }
    }
  }

  // Co-op ("open to LAN"). Guests connect to a second listener on every
  // interface; the host keeps playing over the loopback one, which guests
  // can't reach. Hosting ends when the world is closed or switched.
  async startHosting({ port, password }) {
    try {
      await this.standaloneSocketServer.openGuestListener('0.0.0.0', port)
    } catch(e) {
      if (e.code === 'EADDRINUSE') throw new Error('Port ' + port + ' is already in use. Choose another port.')
      if (e.code === 'EACCES') throw new Error('Not allowed to use port ' + port + '. Choose another port.')
      throw e
    }

    this.coopHost = {
      port: port,
      passwordDigest: password ? this.digestPassword(password) : null
    }

    LOG.info('Hosting co-op on port ' + port + (password ? ' with a password' : ''))
    this.forEachGame((game) => {
      game.forEachPlayer((player) => this.sendHostingStatus(player))
    })
  }

  stopHosting(reason) {
    if (!this.coopHost) return

    this.standaloneSocketServer.sockets.forEach((socket) => {
      if (socket.isGuest) this.socketUtil.emit(socket, "PlayerKick", { reason: reason })
    })
    this.standaloneSocketServer.closeGuestListener()
    this.coopHost = null

    LOG.info('Stopped hosting co-op')
  }

  getHostingStatus() {
    if (!this.coopHost) return null
    let game = this.getMainGame()

    return {
      worldId: game ? game.getId() : null,
      port: this.coopHost.port,
      addresses: this.getLanAddresses(),
      hasPassword: !!this.coopHost.passwordDigest
    }
  }

  // tells the world owner where guests can join, once they are in the game
  sendHostingStatus(player) {
    let status = this.getHostingStatus()
    if (!status || !player.isSectorOwner() || !player.isPlayerReady) return

    let addresses = status.addresses.map((address) => address + ':' + status.port)
    let where = addresses.length ? addresses.join(', ') : 'port ' + status.port
    player.showChatSuccess('Co-op is open. Friends join at ' + where + (status.hasPassword ? ' with your password' : ''))
  }

  // IPv4 addresses of this machine that other machines can use, LAN or VPN
  // (Tailscale, ZeroTier); IPv6 addresses aren't offered in the join menu
  getLanAddresses() {
    let addresses = []
    let interfaces = os.networkInterfaces()
    for (let name in interfaces) {
      interfaces[name].forEach((entry) => {
        if (entry.family === 'IPv4' || entry.family === 4) {
          if (!entry.internal) addresses.push(entry.address)
        }
      })
    }

    return addresses
  }

  digestPassword(password) {
    return crypto.createHash('sha256').update(String(password)).digest()
  }

  isHostPasswordAccepted(password) {
    if (!this.coopHost) return false
    if (!this.coopHost.passwordDigest) return true
    if (typeof password !== 'string') return false
    return crypto.timingSafeEqual(this.digestPassword(password), this.coopHost.passwordDigest)
  }

  // guest upgrades carry ?protocol=<hash>&password=<password>; a client with
  // another protocol would send messages this server decodes as garbage
  authorizeGuest(req) {
    let query = new URL(req.url, 'http://localhost').searchParams
    if (query.get('protocol') !== protocolHash) return false
    return this.isHostPasswordAccepted(query.get('password') || '')
  }

  // join preflight: lets a client show a clear version or password error
  // before connecting, instead of a failed socket
  getJoinInfo(req, isGuest) {
    let query = new URL(req.url, 'http://localhost').searchParams
    let game = this.getMainGame()
    let requiresPassword = isGuest && !!(this.coopHost && this.coopHost.passwordDigest)

    return {
      protocolHash: protocolHash,
      version: this.gameVersion,
      worldName: game && game.sector ? game.sector.name : null,
      requiresPassword: requiresPassword,
      passwordAccepted: !requiresPassword || this.isHostPasswordAccepted(query.get('password') || '')
    }
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

  async getPlayersBy(options = {}) {
    const ipAddress = options.ipAddress
    const idToken = options.idToken
    const userUid = options.userUid
    const username = options.username

    let players = []
    let uid = ""

    if (idToken || userUid) {
      uid = await this.getUidFromRequest(idToken, userUid)
    }

    this.forEachGame((game) => {
      game.forEachPlayer((player) => {
        if (player.getRemoteAddress() === ipAddress ||
            player.getUid() === uid ||
            player.getName() === username) {
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
    if (global.isMatchmakerDisabled) return

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
      let playersToRemove = await this.getPlayersBy({
        ipAddress: data.ipAddress, 
        idToken: data.idToken, 
        userUid: data.uid
      })
      playersToRemove.forEach((player) => {
        let duration = player.getSessionDuration()
        LOG.info(player.name + " removePlayerFromMatchmaker. session duration: " + Helper.stringifyTimeShort(duration))
        player.remove()
      })
    }
  }

  async onBanWorldAndOwner(data) {
    let players = await this.getPlayersBy({ userUid: data.creatorUid })
    let player = players[0]

    let username
    let targetIp

    if (!player) {
      // search on DB
      let user = await User.findOne({
        where: { uid: data.creatorUid }
      })

      if (!user) return

      username = user.username
      targetIp = user.ip
    } else {
      username = player.getName()
      targetIp = player.getRemoteAddress()
    }

    let existingBan = await IpBan.findOne({
      where: { ip: targetIp, username: username }
    })

    if (!existingBan) {
      await IpBan.create({
        ip: targetIp,
        username: username,
        dayCount: 60,
        reason: "Ban World"
      })
    }

    let game = junonServer.games[data.sectorUid]
    if(game) {
      game.deleteForever()
    }
  }

  async onKickPlayer(data) {
    let players = await this.getPlayersBy({ ipAddress: data.ip, username: data.username })
    let player = players[0]
    player.kick()
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
          sessionId: data.sessionId,
          creatorIp: data.creatorIp,
          creatorUid: sectorModel.creatorUid,
          sectorData: { id: sectorId, name: sectorModel.name, sectorModel: sectorModel },
          gameMode: data.gameMode || sectorModel.gameMode,
          rowCount: parseInt(data.rowCount),
          colCount: parseInt(data.colCount),
          isPrivate: data.isPrivate,
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
        case "BanWorldAndOwner":
          this.onBanWorldAndOwner(data)
          break
        case "KickPlayer":
          this.onKickPlayer(data)
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
    if (global.isMatchmakerDisabled) return

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

    let listening
    if (isStandalone) {
      listening = this.initStandaloneSocketServer()
    } else {
      this.initUwsServer()
    }

    this.gameLoopHelper = new GameLoop()
    setInterval(this.mainLoop.bind(this), this.PHYSICS_TIMESTEP)
    setInterval(this.scoreLoop.bind(this), this.LEADERBOARD_TIMESTEP)

    return listening
  }

  onSocketOpen(ws) {
    this.socketUtil.registerSocket(ws)
  }

  onSocketData(ws, message, isBinary) {
    if (isBinary) {
      this.socketUtil.onMessage(ws, message)
    } else {
      this.socketUtil.onTextMessage(ws, message)
    }
  }

  onSocketClose(ws) {
    ws.isClosed = true
    this.socketUtil.unregisterSocket(ws)
    this.onClientDisconnect(ws)
  }

  // uWebSockets.js only loads under Node's own ABI, so it is required here
  // rather than at the top: the standalone (Electron) runtime never loads it
  initUwsServer() {
    const uws = require('uWebSockets.js')

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
      upgrade: (res, req, context) => {
        // ws.getRemoteAddress() is unreliable on this uWebSockets.js build -
        // it returns an empty ArrayBuffer even when called synchronously in
        // `open`, verified against v20.70.0. The HttpResponse's
        // getRemoteAddress() still works correctly here, pre-upgrade, so
        // capture it now and hand it to the WebSocket as user data; uWS
        // merges that object's properties directly onto the resulting `ws`.
        res.upgrade(
          { remoteAddress: Helper.getSocketRemoteAddress(res) },
          req.getHeader('sec-websocket-key'),
          req.getHeader('sec-websocket-protocol'),
          req.getHeader('sec-websocket-extensions'),
          context
        )
      },
      open: this.onSocketOpen.bind(this),
      message: this.onSocketData.bind(this),
      close: this.onSocketClose.bind(this)
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

    this.initOperatorEndpoints(app)

    let onListen = (token) => {
      if (token) {
        console.log('Junon Gameserver listening to port ' + this.APP_SERVER_PORT)
      } else {
        console.log('Gameserver failed to listen to port ' + this.APP_SERVER_PORT)
      }
    }

    app.listen(this.APP_SERVER_PORT, onListen)
  }

  initStandaloneSocketServer() {
    this.gameVersion = fs.readFileSync(appRoot + "/VERSION.txt", 'utf8').trim()

    this.standaloneSocketServer = new StandaloneSocketServer({
      open: this.onSocketOpen.bind(this),
      message: this.onSocketData.bind(this),
      close: this.onSocketClose.bind(this),
      authorizeGuest: this.authorizeGuest.bind(this),
      http: (req, res, isGuest) => {
        if (req.method !== 'GET') return false

        let pathname = req.url.split('?')[0]
        if (pathname === '/info') {
          res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' })
          res.end(JSON.stringify(this.getJoinInfo(req, isGuest)))
          return true
        }

        if (pathname === '/ping') {
          res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'text/plain' })
          res.end('pong')
          return true
        }

        if (pathname === '/join') {
          let ip = StandaloneSocketServer.normalizeAddress(req.socket.remoteAddress)
          res.writeHead(200, { 'Access-Control-Allow-Origin': '*' })
          res.end(JSON.stringify({ success: this.reserveSpot(ip) }))
          return true
        }

        return false
      }
    })

    // a game socket that can't listen leaves nothing to play on; exit so the
    // launcher sees it instead of a server that silently isn't reachable
    return this.standaloneSocketServer.listen(this.getStandaloneBindHost(), this.APP_SERVER_PORT).then(() => {
      console.log('Junon Gameserver listening to port ' + this.APP_SERVER_PORT)
    }).catch((e) => {
      LOG.error('Gameserver failed to listen to port ' + this.APP_SERVER_PORT + ': ' + e.message)
      process.exit(1)
    })
  }

  // hosted-infrastructure endpoints (metrics scraping, matchmaker visibility
  // toggle); standalone servers use their own socket server without them
  initOperatorEndpoints(app) {
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
        // less lag tolerance for guest worlds
        let limit = game.isCreatedByAnonynmous() ? 400 : 1200
        
        let startProcessTime = (new Date()).getTime()
        game.stepWorld()
        game.sendUpdates()
        let endProcessTime = (new Date()).getTime()
        
        // remove worlds that are likely too resource-intensive. A standalone
        // server hosts only the player's own world, so it is never evicted.
        if(!isStandalone && endProcessTime - startProcessTime >= limit){
          game.isGameReady = false
          game.forEachPlayer((player) => {
            if (player.socket) player.socket.close()
            player.remove()
          })
          game.prepareRemove()
        }
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
