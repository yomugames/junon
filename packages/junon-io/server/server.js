require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env'), quiet: true })

global.env = process.env.NODE_ENV || 'development'
global.pid = process.pid

// `npm run server` (development) keeps its worlds in the repository's
// gitignored .dev-saves directory unless JUNON_SAVES_DIR is set. Must run
// before junon-common/db/config.js is loaded.
if (env === 'development' && !process.env.JUNON_SAVES_DIR) {
  process.env.JUNON_SAVES_DIR = require('path').resolve(__dirname, '../../../.dev-saves')
}

global.require = require


require("./util/polyfill")

const path = require('path')
const os = require('os')
const crypto = require('crypto')
const http = require("http")
const express = require("express")
const bodyParser = require('body-parser')
const fs = require("fs")
const Polyglot = require('node-polyglot')
const englishTranslationMap = require('../common/translations/en')
const japaneseTranslationMap = require('../common/translations/ja')
const russianTranslationMap = require('../common/translations/ru')
const SectorModel = require("junon-common/db/sector")
const ObjectPool = require("../common/entities/object_pool")
const TileHit = require("./entities/tile_hit")
const User = require("junon-common/db/user")
const IpBan = require("junon-common/db/ip_ban")
const sequelize = require("junon-common/db/sequelize")
const syncStandaloneSchema = require("junon-common/db/standalone_schema")
const StandaloneWorlds = require("junon-common/standalone_worlds")
const SaveImporter = require("junon-common/save_importer")
const Item = require("./entities/item")

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

// The game server hosts one world per process, saved under JUNON_SAVES_DIR,
// with a SQLite registry. NODE_ENV only selects gameplay settings:
// `standalone` plays like the released game, `development` and `test` turn on
// debugMode (fast waves and building, admin mode, app_debug.proto).

// The desktop shell (packages/junon-desktop) runs the server in an Electron
// utility process, which provides process.parentPort. It serves the client
// itself and talks to this process over that port, so no page server.
const isDesktop = !!process.parentPort

// same hash as the client build's (gulpfile.js), read without shelling out to
// npm/cat, which a packaged desktop app doesn't have
let protocolDirectory = path.join(path.dirname(require.resolve("junon-common/package.json")), "protocol")
let protocolContents = ["enum.proto", "base.proto", "app.proto"].map((file) => {
  return fs.readFileSync(path.join(protocolDirectory, file))
})
global.protocolHash = require('crypto').createHash('md5').update(Buffer.concat(protocolContents)).digest("hex").substring(0,8)

const Protocol = require("../common/util/protocol")
const Constants = require("../common/constants.json")
const SocketUtil = require("junon-common/socket_util")
const GameLoop = require("./util/game_loop")
const Game = require("./entities/game")
const ExceptionReporter = require("junon-common/exception_reporter")
const LOG = require('junon-common/logger')
const Helper = require('../common/helper')
const StandaloneSocketServer = require('./util/standalone_socket_server')
const Profiler = require('../common/profiler')
const RemoteEventHandler = require('./entities/remote_event_handler')
const WorldSerializer = require("junon-common/world_serializer")
const EventBus = require("eventbusjs")


class Server {
  constructor() {
    this.games = {}
    this.stats = {}
    this.lastQueueIndex = {}
    this.lastAutoSaveTime = Date.now()
    this.lastSaveTime = Date.now()
    this.sectorLoadQueue = []
    this.sectorSaveQueue = []
  }

  getEventBus() {
    return EventBus
  }

  async run() {
    if (process.env.JUNON_WORLD_ID && !process.env.JUNON_OWNER_UID) {
      LOG.error("JUNON_OWNER_UID is not defined")
      process.exit(1)
    }

    // the sqlite file lives in the saves directory (junon-common/db/config.js);
    // tests use an in-memory database, which starts empty
    fs.mkdirSync(WorldSerializer.getSavesDirectory(), { recursive: true })
    await syncStandaloneSchema(sequelize)

    this.fetchServerInfo()

    await this.initProtocol()
    await WorldSerializer.initSerializer()

    await this.initConstants()

    // process.env.PORT is a string
    this.APP_SERVER_PORT = parseInt(process.env.PORT) || 8000

    this.initExceptionReporter()
    this.initRemoteEventHandler()

    await this.initWebsocketServer()

    this.initObjectPools()

    if (this.onServerReadyListener) this.onServerReadyListener()

    if (!isDesktop) {
      await this.initDevelopmentAppServer()
    }

    this.initStandaloneProcessHandlers()
    if (process.env.JUNON_WORLD_ID) await this.loadStandaloneWorld()

    if (isDesktop) {
      this.initDesktopChannel()
    }

  }

  // The launcher (desktop shell, or a developer running `npm run server`) picks the
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

    // save before exiting so closing the game (or Ctrl-C on `npm run server`)
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

  initExceptionReporter() {
    ExceptionReporter.init(process.env["JUNON_SERVER_SENTRY_DSN"])
  }

  fetchServerInfo() {
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

  // the game socket only accepts connections from this machine; co-op hosting
  // opens a separate guest listener (startHosting)
  getStandaloneBindHost() {
    return process.env.JUNON_HOST || '127.0.0.1'
  }

  getHost() {
    return [this.getStandaloneBindHost(), this.APP_SERVER_PORT].join(":")
  }

  memsize(obj) {
    return Helper.roughSizeOfObject(obj)
  }

  getVersion() {
    return this.gameVersion
  }

  getRevision() {
    return this.gameRevision
  }

  getPlayerCount() {
    let total = 0

    this.forEachGame((game) => {
      total += game.getPlayerCount()
    })

    return total
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
  }

  removeGame(game) {
    delete this.games[game.getId()]
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

  // Page server for playing in a browser (the desktop app serves the client
  // itself): the client, and the local world menu's /local/* routes
  initDevelopmentAppServer() {
    const app = express()
    app.use(bodyParser.json())
    app.use(express.static(appRoot + "/client/dist"))
    app.use(express.static(appRoot + "/client/"))
    app.set('views', appRoot + '/client')
    app.set('view engine', 'ejs')

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

    let gameVersion        = fs.readFileSync(appRoot + "/VERSION.txt", 'utf8').replace("\n","")
    let changeLogs         = this.fetchChangeLogs().reverse()

    // runs arbitrary game commands unauthenticated - development only
    if (debugMode) {
      app.get('/debug/:message', (req, res) => {
        let result = this.getMainGame().runCommand(req.params.message, req.query)
        res.send({ result: result })
      })
    }

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
    let devAppServerPort = parseInt(process.env.JUNON_CLIENT_PORT) || 8001

    // serves the client to this machine only
    let devAppServerHost = '127.0.0.1'

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

  async findSectorWithAttributers(sectorId) {
    return await SectorModel.findOne({
      attributes: ['uid', 'name', 'daysAlive', 'creatorUid', 'screenshot', 'gameMode', 'isPrivate', 'createdAt'],
      where: { uid: sectorId },
      include: [
        { model: User, as: 'creator' }
      ]
    })
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

  initWebsocketServer() {

    // register events
    for (let eventName in Protocol.definition().MessageWrapper.fields) {
      this.socketUtil.on(eventName, this.onSocketMessage.bind(this, eventName))
    }

    let listening = this.initStandaloneSocketServer()

    this.gameLoopHelper = new GameLoop()
    setInterval(this.mainLoop.bind(this), this.PHYSICS_TIMESTEP)

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

  mainLoop() {
    this.beginMeasure("tick")

    for (let gameId in this.games) {
      let game = this.games[gameId]

      try {
        game.recordClock()
        game.stepWorld()
        game.sendUpdates()
      } catch (e) {
        ExceptionReporter.captureException(e)
      }
    }

    this.processQueues()
    this.processSectorLoadQueue()
    this.processSectorSaveQueue()
    this.autoSaveWorlds()

    this.endMeasure("tick")

    this.reportPerformance()
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

  isServerFull(socket) {
    return this.getPlayerCount() >= 40
  }

}

let isCalledDirectly = require.main === module
if (isCalledDirectly) {
  global.server = new Server()
  global.server.run()
}

global.JunonServer = Server

module.exports = Server
