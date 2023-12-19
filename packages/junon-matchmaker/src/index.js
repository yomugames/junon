global.env = process.env.NODE_ENV || 'development'
global.debugMode = env === 'development' ? true : false

global.PLAYER_CAPACITY_PER_SECTOR = 5
global.MAX_SECTORS_PER_SERVER = 8
global.SERVER_COUNT_PER_NODE = env ==='staging' ? 2 : 4
global.SCALE_UP_REQUIRED_USAGE_THRESHOLD = 0.8
global.SCALE_DOWN_USAGE_THRESHOLD = 0.5
global.SCALE_UP_INTERVAL = 15 * 60 * 1000 // 15 minutes


const bucketName = "junon"

const fs = require("fs")
const http = require("http")
const express = require("express")
const base64id = require('base64id')
const cors = require('cors')
const uws = require('uWebSockets.js')
const morgan = require('morgan')
const ExceptionReporter = require("junon-common/exception_reporter")
const SocketUtil = require("junon-common/socket_util")
const LOG = require('junon-common/logger')
const queryString = require('querystring')
const util = require('util')
const User = require("junon-common/db/user")
const SectorModel = require("junon-common/db/sector")
const Favorite = require("junon-common/db/favorite")
const IpBan = require("junon-common/db/ip_ban")
const FriendModel = require("junon-common/db/friend")
const SectorBan = require("junon-common/db/sector_ban")
const Sequelize = require("sequelize")
const sequelize = require("junon-common/db/sequelize")
const MiniGame = require("./minigame")
const WorldSerializer = require("junon-common/world_serializer")
const Op = Sequelize.Op;

let textDecoder = new util.TextDecoder()

const FirebaseAdminHelper = require("./firebase_admin_helper")
const Environment = require('./environment')
const BadWordsFilter = require("./bad_words_filter")

global.getSocketRemoteAddress = (socket) => {
  let uint8Array = new Uint8Array(socket.getRemoteAddress())
  return [uint8Array[12], uint8Array[13], uint8Array[14], uint8Array[15]].join(".")
}

function toArrayBuffer(buffer) {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

class MatchmakerServer {
  constructor() {
    this.bootTime = Date.now()
    this.APP_SERVER_PORT = debugMode ? 3000 : 80
    this.GAME_WEBSOCKET_SERVER_PORT = 2095

    this.ENVIRONMENT_LIST = ["vm", "development", "staging", "production"]

    ExceptionReporter.init(process.env["JUNON_MATCHMAKER_SENTRY_DSN"])

    FirebaseAdminHelper.init()
    WorldSerializer.initSerializer()

    this.socketUtil = new SocketUtil({ isTextMode: true })

    this.init()
  }

  init() {
    this.onlinePlayers = {}

    this.onlinePlayersByIp = {}
    this.onlinePlayersByHost = {}
    this.environments = {}
    this.gameServerSockets = {}
    this.latencyProfiles = {}
    this.topColonies = {}
    this.miniGames = {}
    this.initMiniGames()

    this.exportsByUser = {}
    this.importsByUser = {}

    this.apiRequestsByIp = {}

    this.currentImports = {}

    this.environments[env] = new Environment(this, env)
  }

  async run() {
     // this.topColonies = JSON.parse(require("fs").readFileSync('top_sectors.json', 'utf8'))
    this.periodicallyFetchTopSectors()
    this.periodicallyScaleNodes()
    this.periodicallyCheckRegions()
    this.reportCrashedServers()
    this.initServerForPlayers()
    this.initWebsocketServerForGames()
  }

  async periodicallyScaleNodes() {
    if (global.isOffline) return
    if (debugMode) return

    let environment = this.getEnvironment()
    environment.forEachRegion((region) => {
      region.scaleNodes()
    })

    let fifteenMinutes = 1000 * 60 * 15
    setTimeout(this.periodicallyScaleNodes.bind(this), fifteenMinutes)
  }

  periodicallyCheckRegions() {
    let environment = this.getEnvironment()
    environment.forEachRegion((region) => {
      region.detectDisconnectedPvPSectors()
    })

    let tenSeconds = 1000 * 10
    setTimeout(this.periodicallyCheckRegions.bind(this), tenSeconds)
  }

  async periodicallyFetchTopSectors() {
    if (global.isOffline) return

    this.topColonies = await this.listTopSectors()
    let oneHour = 1000 * 60 * 60
    setTimeout(this.periodicallyFetchTopSectors.bind(this), oneHour)
  }


  async listTopSectors() {
    let weeklySectors = await this.listTopSectorsForWeek()
    let allSectors = await this.listTopSectorsAllTime()

    let combined = allSectors
    for (let sectorId in weeklySectors) {
      let sectorData = weeklySectors[sectorId]
      if (combined[sectorId]) {
        combined[sectorId]["new"] = true
      } else {
        combined[sectorId] = sectorData
      }
    }

    return combined
  }

  async listTopSectorsForWeek() {
    let now = new Date()
    let lastWeekDate = new Date(now - (1000 * 60 * 60 * 24 * 7))

    let topSectors = await SectorModel.findAll({
      where: { 
        createdAt: {
          [Op.gte]: lastWeekDate 
        },
        creatorUid: {
          [Op.ne]: null
        },
        isPrivate: {
          [Op.ne]: true
        }
      },
      order: [['daysAlive', 'DESC']],
      limit: 50
    })

    let result = this.parseTopSectors(topSectors, "week")
    return result
  }

  getTopSqlQuery() {
    if (env === 'development') {
      return "select uid, name, daysAlive, creatorUid, screenshot, gameMode, isPrivate, upvoteCount, downvoteCount, rating from sectors " +
             "where sectors.isPrivate <> true " +
             "group by sectors.uid " + 
             "order by upvoteCount desc " +
             "limit 50"
    } else {
      return "select uid, name, daysAlive, creatorUid, screenshot, gameMode, isPrivate, upvoteCount, downvoteCount, rating from sectors " +
             "where sectors.isPrivate <> true " +
             "group by sectors.uid " + 
             "order by upvoteCount desc " +
             "limit 50"
    }
  }

  async listTopSectorsAllTime() {
    let query = this.getTopSqlQuery()
                
    const topSectors = await sequelize.query(query, {
      model: SectorModel,
      mapToModel: true // pass true here if you have any mapped fields
    })

    let result = this.parseTopSectors(topSectors, "top")
    return result
  }


  parseTopSectors(topSectors, filter) {
    let result = {}

    topSectors.forEach((sector) => {
      let data = sector.toJSON()

      if (filter) data[filter] = true
      result[sector.uid] = data
    })

    return result
  }

  reportCrashedServers() {
    try {
      let report = this.getCrashReport()

      if (report.length > 0) {
        console.log(report)
      }
    } catch (e) {
      ExceptionReporter.captureException(e)
    }

    let twentyMinutes = debugMode ? 1000 * 10 : 1000 * 60 * 20
    setTimeout(this.reportCrashedServers.bind(this), twentyMinutes)
  }

  async getUidFromRequest(idToken, uid) {
    if (debugMode) return uid
    return await FirebaseAdminHelper.verifyIdToken(idToken)
  }

  getCrashReport() {
    let report = ""

    this.getEnvironment().forEachRegion((region) => {
      let crashedServers = region.extractCrashedServers()
      if (Object.keys(crashedServers).length > 0) {
        let crashReport = this.getCrashReportForRegion(crashedServers)
        if (crashReport.length > 0) {
          report += "=== REGION === \n"
          report += region.name
          report += "\n"
          report += "============== \n"
          report += crashReport
        }

      }
    })

    return report
  }

  getCrashReportForRegion(crashed) {
    let message = ""

    for (let nodeName in crashed) {
      message += "Node: "
      message += nodeName 
      message += "\n"
      message += "-----\n"

      let crashedServers = crashed[nodeName]
      for (let host in crashedServers) {
        let data = crashedServers[host]
        let row = host + " crashed with " + data.server.getPlayerCount() + " players on " + (new Date(data.disconnectedAt)) 
        message += row
      }
    }

    return message
  }

  forEachEnvironment(cb) {
    for (let environmentName in this.environments) {
      cb(this.environments[environmentName])
    }
  }

  onPlayerDisconnect(socket) {
    try {
      this.forEachEnvironment((environment) => {
        environment.forEachRegion((region) => {
          region.removeSocket(socket)
        })
      })

      if (socket.uid) {
        delete this.onlinePlayers[socket.uid]
        this.forEachOnlinePlayer((playerSocket) => {
          this.socketUtil.emit(playerSocket, "PlayerOffline", { uid: socket.uid })
        })
      }
    } catch(e) {
      ExceptionReporter.captureException(e)
    }
  }

  buildUwsApp() {
    let app

    app = uws.App()

    return app
  }

  decodeArrayBufferAsString(arrayBuffer) {
    let result = ""

    try {
      result = String.fromCharCode.apply(null, new Uint8Array(arrayBuffer))
    } catch(e) {
      ExceptionReporter.captureException(e)
    }

    return result
  }

  getSectorSavePath(sectorUid) {
    let namespace = "development"
    if (env === "staging" || env === "production") {
      namespace = "production"
    }

    return ["sectors", namespace, sectorUid, "sector.sav"].join("/")
  }

  async isMod(idToken) {
    let uid = await this.getUidFromRequest(idToken, uid)
    if (!uid) return false

    let modIds = [
      "5t1H4HSXgGRzCw0isgiwxBf2cXn2", 
      "c1ZwNiSozAWrVSPOD6dspydyYOR2", 
      "jEleFj7LAVhfv8FwLEKejEj6ESx2"
    ]

    if (modIds.indexOf(uid) !== -1) {
      return true
    }

    return false
  }

  initServerForPlayers() {
    let app = this.buildUwsApp()

    app.get('/servers', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')
      res.writeHeader('Content-Type','text/plain')
      this.onListServers(res, req)
    })

    app.get('/server_status', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')
      res.writeHeader('Content-Type','text/plain')
      this.onServerStatus(res, req)
    })

    app.get('/bans', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')
      res.writeHeader('Content-Type','text/plain')
      this.onBanList(res, req)
    })

    app.get('/ping', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')
      res.writeHeader('Content-Type','text/plain')
      res.end('pong')
    })

    app.get('/search', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')
      res.writeHeader('Content-Type','text/plain')

      this.onSearch(res, req)
    })

    app.get('/search_player', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')
      res.writeHeader('Content-Type','text/plain')

      this.onSearchPlayer(res, req)
    })

    app.get('/export_sector', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')

      this.onExportSector(res, req)
    })

    app.options('/import_sector', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')
      res.writeHeader('Access-Control-Allow-Methods','POST, GET, OPTIONS, DELETE')
      res.writeHeader('Access-Control-Allow-Headers','Origin, X-Requested-With, Content-Type, Accept, Token, Sector, Uid')
      res.end()
    })

    app.post('/import_sector', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')
      // res.writeHeader('Content-Type','application/json')

      this.onImportSector(res, req)
    })

    app.options('/friend_request', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')
      res.writeHeader('Access-Control-Allow-Methods','POST, GET, OPTIONS, DELETE')
      res.writeHeader('Access-Control-Allow-Headers','Origin, X-Requested-With, Content-Type, Accept')
      res.end()
    })

    app.post('/friend_request', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')

      this.onFriendRequest(res, req)
    })

    app.options('/unfriend', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')
      res.writeHeader('Access-Control-Allow-Methods','POST, GET, OPTIONS, DELETE')
      res.writeHeader('Access-Control-Allow-Headers','Origin, X-Requested-With, Content-Type, Accept')
      res.end()
    })

    app.post('/unfriend', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')

      this.onRemovefriend(res, req)
    })

    app.options('/accept_friend_request', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')
      res.writeHeader('Access-Control-Allow-Methods','POST, GET, OPTIONS, DELETE')
      res.writeHeader('Access-Control-Allow-Headers','Origin, X-Requested-With, Content-Type, Accept')
      res.end()
    })

    app.post('/accept_friend_request', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')

      this.onAcceptFriendRequest(res, req)
    })

    app.options('/ignore_friend_request', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')
      res.writeHeader('Access-Control-Allow-Methods','POST, GET, OPTIONS, DELETE')
      res.writeHeader('Access-Control-Allow-Headers','Origin, X-Requested-With, Content-Type, Accept')
      res.end()
    })

    app.post('/ignore_friend_request', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')

      this.onIgnoreFriendRequest(res, req)
    })

    app.get('/top_colonies', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')
      res.writeHeader('Content-Type','text/plain')

      res.end(JSON.stringify(this.topColonies))
    })

    app.get('/join_check', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')
      res.end('success')
    })

    app.get('/checkname', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')
      res.writeHeader('Content-Type','text/plain')

      try {
        let query = queryString.decode(req.getQuery())

        if (BadWordsFilter.isBadWord(query.username)) {
          res.end('invalid')
        } else {
          res.end('valid')
        }
      } catch(e) {
        ExceptionReporter.captureException(e)
        res.end('invalid')
      }
    })

    app.options('/create_user', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')
      res.writeHeader('Access-Control-Allow-Methods','POST, GET, OPTIONS, DELETE')
      res.writeHeader('Access-Control-Allow-Headers','Origin, X-Requested-With, Content-Type, Accept')
      res.end()
    })

    app.get('/get_user', async (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')
      res.writeHeader('Content-Type','text/plain')
      
      res.onAborted(() => {
        console.log('User find aborted')
      })

      try {
        let query = queryString.decode(req.getQuery())
        let uid = query.uid

        let user = await User.findOne({ 
          where: {uid: uid},
          include: [
            { model: SectorModel, as: 'saves' },
            { model: SectorModel, as: 'sector' },
            { model: SectorModel, as: 'favorites' }
          ]
        })

        if (!user) {
          let data = { error: "User not found" }
          return res.end(JSON.stringify(data))
        }

        let friends = await FriendModel.findAll({
          where: {
            [Op.or]: [
              { userUid: uid },
              { friendUid: uid }
            ]
          },
          include: [
            { model: User, as: 'sender', attributes:['username'] },
            { model: User, as: 'receiver', attributes:['username'] }
          ]
        })

        let userData = user.getData()
        userData.favorites.forEach((favorite) => {
          delete favorite.Favorite
        })

        delete userData["email"]
        delete userData["ip"]
        delete userData["createdAt"]

        userData["friends"] = friends

        res.end(JSON.stringify(userData))
      } catch(e) {
        ExceptionReporter.captureException(e)
        res.end(JSON.stringify({ error: 'invalid' }))
      }
    })

    app.options('/create_ban', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')
      res.writeHeader('Access-Control-Allow-Methods','POST, GET, OPTIONS, DELETE')
      res.writeHeader('Access-Control-Allow-Headers','Origin, X-Requested-With, Content-Type, Accept')
      res.end()
    })

    app.post('/create_ban', async (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')

      this.readJson(res).then(async (body) => {
        try {
          if (!body.idToken) {
            let data = { error: "Missing idToken. Make sure you are properly logged in." }
            res.end(JSON.stringify(data))
            return
          }

          let isMod = await this.isMod(body.idToken)
          if (!isMod) {
            let data = { error: "Invalid credentails." }
            res.end(JSON.stringify(data))
            return
          }

          let userToBan = await User.findOne({ 
            where: { username: body.username }
          })

          let ipAddress = body.username
          let isIpAddress = require('net').isIP(ipAddress)

          if (!userToBan && !isIpAddress) {
            let data = { error: "No such user." }
            res.end(JSON.stringify(data))
            return
          }

          if (userToBan && !userToBan.ip) {
            let data = { error: "User has no available IP." }
            res.end(JSON.stringify(data))
            return
          }

          let targetIp = userToBan ? userToBan.ip : ipAddress
          let username = userToBan ? body.username : null

          let data = {
            ip: targetIp,
            username: username,
            dayCount: body.dayCount,
            reason: body.reason
          }

          let existingBan = await IpBan.findOne({
            where: { ip: targetIp, username: username }
          })

          if (existingBan) {
            let data = { error: "User already banned" }
            res.end(JSON.stringify(data))
            return
          }

          let ipBan = await IpBan.create(data)
          res.end(JSON.stringify({ success: body.username + " banned" }))
        } catch(e) {
          ExceptionReporter.captureException(e)
          let data = { error: "Ban error" }
          res.end(JSON.stringify(data))
        }
      })
    })


    app.post('/create_user', async (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')

      this.readJson(res).then(async (body) => {
        try {
          if (!body.idToken) {
            let data = { error: "Missing idToken. Make sure you are properly logged in." }
            res.end(JSON.stringify(data))
            return
          }

          let uid = await this.getUidFromRequest(body.idToken, body.uid)
          if (!uid) {
            let data = { error: "Invalid credentails." }
            res.end(JSON.stringify(data))
            return
          }

          let email = body.email
          let username = body.username

          let user = await User.createOne({ uid: uid, username: username, email: email })
          if (user.error) {
            return res.end(JSON.stringify({ error: user.error }))
          }

          let data = { success: true }
          res.end(JSON.stringify(data))
        } catch(e) {
          ExceptionReporter.captureException(e)
          let data = { error: "Unable to create user" }
          res.end(JSON.stringify(data))
        }
      })

    })


    app.options('/delete_save', (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')
      res.writeHeader('Access-Control-Allow-Methods','POST, GET, OPTIONS, DELETE')
      res.writeHeader('Access-Control-Allow-Headers','Origin, X-Requested-With, Content-Type, Accept')
      res.end()
    })

    app.post('/delete_save', async (res, req) => {
      res.writeHeader('Access-Control-Allow-Origin','*')

      this.readJson(res).then(async (body) => {
        try {
          if (!body.idToken) {
            let data = { error: "Missing idToken. Make sure you are properly logged in." }
            res.end(JSON.stringify(data))
            return
          }

          let uid = await this.getUidFromRequest(body.idToken, body.uid)
          if (!uid) {
            let data = { error: "Invalid credentails." }
            res.end(JSON.stringify(data))

            let ip = getSocketRemoteAddress(res)
            let msg = `[delete_save] User ${ip} attempted to use invalid idToken: ${body.idToken}`
            ExceptionReporter.captureException(new Error(msg))
            return
          }

          let sectorId = body.sectorId

          if (!body.sectorId) {
            let data = { error: "Missing sectorId." }
            res.end(JSON.stringify(data))
          }

          let sectorModel = await SectorModel.findOne({ 
            where: { uid: sectorId, creatorUid: uid }
          })

          let user = await User.findOne({ 
            where: { uid: uid }
          })

          if (!sectorModel) {
            let data = { error: "Player has no save file in " + sectorId }
            res.end(JSON.stringify(data))
            return
          }

          LOG.info(`[deleteSaveFrom]: ${sectorId} - ${sectorModel.name} [creatorUid:${sectorModel.creatorUid}] by [${user.username}][${user.uid}]`)
          await WorldSerializer.deleteSector(sectorId)
          await sectorModel.destroy() 

          let data = { success: true }
          res.end(JSON.stringify(data))
        } catch(e) {
          ExceptionReporter.captureException(e)
          let data = { error: "Unable to delete save file" }
          res.end(JSON.stringify(data))
        }
      })
    })

    app.ws("/*", {
      maxPayloadLength: 16 * 1024 * 1024,
      idleTimeout: 120,
      open: (ws, req) => {
        ws.remoteAddress = getSocketRemoteAddress(ws)

        this.socketUtil.registerSocket(ws)
      },
      message: (ws, message, isBinary) => {
        let textMessage = this.decodeArrayBufferAsString(message)
        this.handlePlayerMessage(ws, textMessage)
      },
      close: (ws, code, message) => {
        ws.isClosed = true
        this.socketUtil.unregisterSocket(ws)
        this.onPlayerDisconnect(ws)
      }
    })

    this.bindPort(app, "Matchmaker", this.APP_SERVER_PORT)
  }

  async removePlayerFromPreviousCreatedGame(environment, ip, data) {
    let uid = await this.getUidFromRequest(data.idToken, data.uid)
    let sectorData = environment.getActivePlayerCreatedGame(ip, uid)
    if (sectorData) {
      LOG.info("removePlayerFromPreviousCreatedGame: ip: " + ip + " idToken: " + data.idToken + " @ sector: " + sectorData.sectorId + " host: " + sectorData.host)
      let gameServerSocket = this.gameServerSockets[sectorData.host]
      if (gameServerSocket) {
        if (!data.stress) {
          this.socketUtil.emit(gameServerSocket, "RemovePlayer", {
            ipAddress: ip,
            idToken: data.idToken,
            uid: data.uid
          })
        }

      }
    }
  }

  async onPlayerOnline(data, socket) {
    try {
      let uid = await this.getUidFromRequest(data.idToken, data.uid)
      if (!uid) return

      this.onlinePlayers[uid] = socket
      socket.uid = uid

      this.socketUtil.emit(socket, "OnlineList", { online: Object.keys(this.onlinePlayers) })

      this.forEachOnlinePlayer((playerSocket) => {
        this.socketUtil.emit(playerSocket, "PlayerOnline", { uid: uid })
      })
    } catch(e) {
      ExceptionReporter.captureException(e)
    }
  }

  forEachOnlinePlayer(cb) {
    for (let uid in this.onlinePlayers) {
      let socket = this.onlinePlayers[uid]
      cb(socket)
    }
  }

  async onNewColony(data, socket) {
    let requestId = base64id.generateId()

    let responseEventName = "PlayerCreateSectorStatus"

    try {
      this.latencyProfiles[requestId] = { start: Date.now() }

      let ip   = socket.remoteAddress
      let region = this.getRegion({ region: data.region })
      if (!region) {
        this.socketUtil.emit(socket, responseEventName, {
          error: "Invalid region " + data.region
        })
        delete this.latencyProfiles[requestId]
        return
      }

      let environment = this.getEnvironment()
      await this.removePlayerFromPreviousCreatedGame(environment, ip, data)

      let node = region.findBusiestAvailableNode({ isTutorial: data.isTutorial })

      if (!node) {
        region = this.getAlternateRegion({ region: data.region })
        if (region) {
          node = region.findBusiestAvailableNode({ isTutorial: data.isTutorial })
        }
      }

      if (!node) {
        this.socketUtil.emit(socket, responseEventName, {
          error: "Servers full. Unable to create game."
        })

        delete this.latencyProfiles[requestId]
        return
      }

      let server = node.getAvailableServer({ isTutorial: data.isTutorial })
      if (!server) {
        this.socketUtil.emit(socket, responseEventName, {
          error: "Available Servers full. Unable to create game."
        })

        delete this.latencyProfiles[requestId]
        return
      }

      let uid

      // check if ip blacklisted
      let isBanned = await this.performBanCheck(data, socket, responseEventName, requestId)
      if (isBanned) return

      let gameServerSocket = this.gameServerSockets[server.host]
      let sectorId

      if (data.isTutorial || global.isOffline) {
        sectorId = base64id.generateId()
      } else {
        uid = await this.getUidFromRequest(data.idToken, data.uid)
        let sectorData = {}

        if (data.name) {
          sectorData.name = data.name // custom colony name
        }

        if (uid) {
          sectorData.creatorUid = uid

          let result = await sequelize.query(`select COUNT(*) as sectorCount from sectors where creatorUid = '${uid}'`, 
                                                  { type: sequelize.QueryTypes.SELECT })
          let sectorCount = result[0].sectorCount
          let maxSectorCount = 20
          if (sectorCount >= maxSectorCount) {
            this.socketUtil.emit(socket, responseEventName, {
              error: "Max Colony limit reached. Please delete your old colonies to create more space"
            })

            delete this.latencyProfiles[requestId]
            return
          }
        }
        if(sectorData.name.length > 255) {
          this.socketUtil.emit(socket, responseEventName, {
            error: "You can't have a very long world name, otherwise you'd completely crash junon =D"
          })
          return
        }
        let sectorModel = await SectorModel.createOne(sectorData)
        sectorId = sectorModel.uid
      }

      server.reserveSpot(sectorId)

      let maxRowCount = 128
      let maxColCount = 128

      if (uid) {
        if (uid === "jEleFj7LAVhfv8FwLEKejEj6ESx2" ||
            uid === "8LuO6XRih2dRNfvtjaS2TwnLWzm1") {
          maxRowCount = 256
          maxColCount = 256
        }
      } 

      let allowedValues = [32, 64, 96, 128]
                 
      let rowCount = Math.min(maxRowCount, data.rowCount || 128)
      let colCount = Math.min(maxColCount, data.colCount || 128)
      if (allowedValues.indexOf(rowCount) === -1) {
        rowCount = 128
      }

      if (allowedValues.indexOf(colCount) === -1) {
        colCount = 128
      }

      let gameParams = {
        sectorId: sectorId,
        creatorIp: ip,
        socketId: socket.id,
        requestId: requestId,
        sessionId: data.sessionId,
        rowCount: rowCount,
        colCount: colCount
      }

      if (data.isTutorial) gameParams.isTutorial = true

      this.latencyProfiles[requestId].matchmakerRequestGame = Date.now()

      this.socketUtil.emit(gameServerSocket, "CreateGame", gameParams)
    } catch(e) {
      delete this.latencyProfiles[requestId]
      ExceptionReporter.captureException(e)
      this.socketUtil.emit(socket, responseEventName, {
        error: "Unable to create colony"
      })
    }
  }

  async isBannedFromSector(sectorId, ip, uid) {
    if (uid) {
      return SectorBan.findOne({ where: { userUid: uid, sectorUid: sectorId } })
    } else {
      return SectorBan.findOne({ where: { ip: ip,   sectorUid: sectorId } })
    }
  }

  isBanExpired(ban) {
    if (ban.dayCount) {
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

  async performBanCheck(data, socket, responseEventName, requestId) {
    let banSets = await this.getBanSets()
    let ipBan = banSets.ipBanSet[socket.remoteAddress]
    let username = data.username && data.username.toLowerCase()
    let userBan = banSets.userBanSet[username]
    let ban = ipBan || userBan

    if (ban) {
      if (data.idToken && !userBan) return false

      if (this.isBanExpired(ban)) {
        this.removeBan({ ip: [ban.ip] })
        return false
      } else {
        this.socketUtil.emit(socket, responseEventName, {
          error: this.formatBanMsg(ban)
        })

        delete this.latencyProfiles[requestId]
        return true
      }
    }

    return false
  }

  async onJoinMiniGame(data, socket) {
    let requestId = base64id.generateId()
    let responseEventName = "JoinMiniGameStatus"
    try {
      let sectorId = data.miniGameId

      let sectorModel = await SectorModel.findOne({ 
        where: { uid: sectorId }
      })

      if (!sectorId) {
        this.socketUtil.emit(socket, responseEventName, {
          error: "Minigame not found."
        })
      }

      // must have default language
      if (!data.language) data.language = "en"

      // check if ip blacklisted
      let isBanned = await this.performBanCheck(data, socket, responseEventName, requestId)
      if (isBanned) return

      let environment = this.getEnvironment()
      let region = environment.getMiniGamesRegion()
      let sector = region.getJoinableMiniGame(sectorId, data)
      if (sector && !data.hostPrivateGame) {
        // found a joinable game instance
        sector.addPlayerJoinQueue(requestId)
        this.socketUtil.emit(socket, responseEventName, { success: true, host: sector.server.host, sectorId: sector.id })
        return
      }

      // find server thats currently being booting a sector
      let pendingSector = region.getJoinablePendingSector(sectorId, data)
      if (pendingSector && !data.hostPrivateGame) {
        pendingSector.addQueue(socket)
        return
      }

      // boot a game instance and if success join it
      let server = region.getAvailableMiniGameServer()
      if (!server) {
        this.socketUtil.emit(socket, responseEventName, { error: "Minigame Servers Full" })
        return
      }

      let gameServerSocket = this.gameServerSockets[server.host]

      let isPrivate = data.hostPrivateGame || data.isPrivate

      this.socketUtil.emit(gameServerSocket, "CreateGame", {
        sectorId: sectorId,
        socketId: socket.id,
        isMiniGame: true,
        requestId: requestId,
        isPrivate: isPrivate,
        targetMiniGameId: data.targetMiniGameId,
        language: data.language
      })

      let pendingSectorOptions = { 
        isPrivate: isPrivate,
        targetMiniGameId: data.targetMiniGameId,
        language: data.language
      }

      pendingSector = server.addPendingSector(sectorId, requestId, pendingSectorOptions)
      pendingSector.addQueue(socket)
    } catch (e) {
      ExceptionReporter.captureException(e)
      this.socketUtil.emit(socket, responseEventName, {
        error: "Unable to boot sector"
      })
    }
  }

  async onBootSector(data, socket) {
    let requestId = base64id.generateId()
    let responseEventName = "PlayerBootSectorStatus"

    try {
      this.latencyProfiles[requestId] = { start: Date.now() }

      let sectorId = data.sectorId

      if (!sectorId) {
        this.socketUtil.emit(socket, responseEventName, {
          error: "Missing sectorId."
        })

        delete this.latencyProfiles[requestId]
        return
      }

      let sectorModel = await SectorModel.findOne({ 
        where: { uid: sectorId }
      })

      if (!sectorModel) {
        this.socketUtil.emit(socket, responseEventName, {
          error: "Sector " + sectorId + " not found"
        })

        delete this.latencyProfiles[requestId]
        return
      }

      if (sectorModel.gameMode === 'pvp') {
        this.socketUtil.emit(socket, responseEventName, {
          error: "Sector " + sectorId + " cannot be manually booted"
        })

        delete this.latencyProfiles[requestId]
        return
      }

      let ip   = socket.remoteAddress
      let region = this.getRegion({ region: data.region })
      if (!region) {
        this.socketUtil.emit(socket, responseEventName, {
          error: "Invalid region " + data.region
        })
        delete this.latencyProfiles[requestId]
        return
      }

      // check if ip blacklisted
      let isBanned = await this.performBanCheck(data, socket, responseEventName, requestId)
      if (isBanned) return

      let environment = this.getEnvironment()
      await this.removePlayerFromPreviousCreatedGame(environment, ip, data)

      // check if sector is already online, can't have two instances (save file overwrite each other..)
      let onlineSector = region.getExistingSector(sectorId)
      if (onlineSector) {
        this.socketUtil.emit(socket, responseEventName, { success: true, host: onlineSector.data.host, sectorId: sectorId, sector: onlineSector.data })
        return
      }

      let uid = await this.getUidFromRequest(data.idToken, data.uid)
      let isSectorBanned = await this.isBannedFromSector(sectorId, socket.remoteAddress, uid)
      if (isSectorBanned) {
        this.socketUtil.emit(socket, responseEventName, {
          error: "You are banned from sector " + sectorId
        })

        delete this.latencyProfiles[requestId]
        return
      }

      let isTutorial = false
      let server
      let node 
      if (data.targetHost) {
        server = region.getServerByHost(data.targetHost)
        if (!server) {
          this.socketUtil.emit(socket, responseEventName, {
            error: "Target Server invalid. Unable to create game."
          })

          delete this.latencyProfiles[requestId]
          return
        }
      } else {
        node = region.findBusiestAvailableNode({ isTutorial: isTutorial })
        if (!node) {
          region = this.getAlternateRegion({ region: data.region })
          if (region) {
            node = region.findBusiestAvailableNode({ isTutorial: isTutorial })
          }
        }

        if (!node) {
          this.socketUtil.emit(socket, responseEventName, {
            error: "Servers full. Unable to create game."
          })

          delete this.latencyProfiles[requestId]
          return
        }

        server = node.getAvailableServer({ isTutorial: isTutorial })
        if (!server) {
          this.socketUtil.emit(socket, responseEventName, {
            error: "Available Servers full. Unable to create game."
          })

          delete this.latencyProfiles[requestId]
          return
        }
      }

      if (this.isImportInProgress(sectorId)) {
        this.socketUtil.emit(socket, responseEventName, {
          error: "Cannot boot. Save file being uploaded. "
        })

        delete this.latencyProfiles[requestId]
        return
      }
      
      server.reserveSpot(sectorId)

      this.latencyProfiles[requestId].matchmakerRequestGame = Date.now()

      let gameServerSocket = this.gameServerSockets[server.host]
      this.socketUtil.emit(gameServerSocket, "CreateGame", {
        sectorId: sectorId,
        creatorIp: ip,
        socketId: socket.id,
        isBootSector: true,
        requestId: requestId
      })
    } catch(e) {
      delete this.latencyProfiles[requestId]

      ExceptionReporter.captureException(e)
      this.socketUtil.emit(socket, responseEventName, {
        error: "Unable to boot sector"
      })
    }
  }

  bindPort(app, name, port) {
    app.listen(port, (token) => {
      if (token) {
        console.log('Matchmaker ' + name + ' listening to port ' + port)
      } else {
        console.log('Matchmaker ' + name + ' failed to listen to port ' + port)
      }
    })

  }

  initWebsocketServerForGames() {
    let app = this.buildUwsApp()

    app.ws("/*", {
      maxPayloadLength: 16 * 1024 * 1024,
      idleTimeout: 120,
      open: (ws, req) => {
        this.socketUtil.registerSocket(ws)
      },
      message: (ws, message, isBinary) => {
        let textMessage = textDecoder.decode(message)
        this.handleGameServerMessage(ws, textMessage)
      },
      close: (ws, code, message) => {
        ws.isClosed = true
        this.socketUtil.unregisterSocket(ws)
        this.onGameServerDisconnect(ws)
      }
    })

    this.bindPort(app, "Game", this.GAME_WEBSOCKET_SERVER_PORT)
  }

  rateLimit(name, socket, func) {
    let maxRequestsPerTenSeconds = 5
    let tenSeconds = 10 * 1000

    let ip = getSocketRemoteAddress(socket)

    this.apiRequestsByIp[name] = this.apiRequestsByIp[name] || {}
    this.apiRequestsByIp[name][ip] = this.apiRequestsByIp[name][ip] || { count: 0, timestamp: Date.now() }

    let durationSinceFirstCall = Date.now() - this.apiRequestsByIp[name][ip].timestamp
    if (durationSinceFirstCall < tenSeconds && 
      this.apiRequestsByIp[name][ip].count >= maxRequestsPerTenSeconds) {
      this.apiRequestsByIp[name][ip].timestamp = Date.now() // wait another 10 sec
      
      return
    } 

    if (durationSinceFirstCall >= tenSeconds) {
      // reset request count
      this.apiRequestsByIp[name][ip] = { count: 0, timestamp: Date.now() }
    }

    this.apiRequestsByIp[name][ip].count += 1
    func()
  }

  handlePlayerMessage(socket, message) {
    try {
      let json = JSON.parse(message)
      let data = json.data

      switch (json.event) {
        // ping
        case "1":
          this.onPing(data, socket)
          break
        case "Online":
          this.onPlayerOnline(data, socket)
          break
        case "NewColony":
          this.onNewColony(data, socket)
          break
        case "BootSector":
          this.onBootSector(data, socket)
          break
        case "JoinMiniGame":
          this.onJoinMiniGame(data, socket)
          break
        case "MatchFilter":
          this.onMatchFilter(data, socket)
          break
        case "RequestSectorList":
          this.rateLimit("onRequestSectorList", socket, () => {
            this.onRequestSectorList(data, socket)
          })
          break
        case "GetSector":
          this.onGetSector(data, socket)
          break
        case "RequestChatHistory":
          this.onRequestChatHistory(data, socket)
          break
      }
    } catch(e) {
      ExceptionReporter.captureException(e)
    }
  }

  handleGameServerMessage(socket, message) {
    try {
      let json = JSON.parse(message)
      let data = json.data
      switch (json.event) {
        case "GameCreateStatus":
          this.onGameCreateStatus(data, socket)
          break
        case "ServerStatus":
          this.onSectorStatus(data, socket)
          break
        case "ServerUpdated":
          this.onServerUpdated(data, socket)
          break
        case "Heartbeat":
          this.onHeartbeat(data, socket)
          break
        case "SectorUpdated":
          this.onSectorUpdated(data, socket)
          break
        case "CanPlayerJoin":
          this.onCanPlayerJoin(data, socket)
          break
        case "SectorRemoved":
          this.onSectorRemoved(data, socket)
          break
        case "RoundStarted":
          this.onRoundStarted(data, socket)
          break
        case "CreatorLeaveSector":
          this.onCreatorLeaveSector(data, socket)
          break
        case "TeamUpdated":
          this.onSectorTeam(data, socket)
          break
        case "PlayerJoin":
          this.onPlayerJoin(data, socket)
          break
        case "PlayerLeave":
          this.onPlayerLeave(data, socket)
          break
        case "GlobalClientChat":
          this.onGlobalClientChat(data, socket)
          break
      }
    } catch(e) {
      ExceptionReporter.captureException(e)
    }

  }

  /*
    region: "us-west", ip: 43.11.22.139, name: "outlaw star", members: ["jude"]
  */
  onSectorTeam(data, socket) {
    let sector = this.getSector(data)
    if (!sector) return

    sector.updateTeam(data)

    // update topColonies name if user changes it
    if (this.topColonies[data.sectorId]) {
      this.topColonies[data.sectorId].name = data.name // update name
    }
  }

  removeOnlinePlayers(host) {
    let onlinePlayersMap = this.onlinePlayersByHost[host]
    if (onlinePlayersMap) {
      let playerIdentifiers = Object.keys(onlinePlayersMap)
      playerIdentifiers.forEach((playerIdentifier) => {
        delete this.onlinePlayersByIp[playerIdentifier] 
      })

      delete this.onlinePlayersByHost[host]
    }
  }

  onCanPlayerJoin(data, socket) {
    let playerIdentifier = [data.playerRemoteAddress, data.fingerprint].join("-")
    if (this.onlinePlayersByIp[playerIdentifier]) {
      this.socketUtil.emit(socket, "CanPlayerJoinResponse", {
        requestId: data.requestId,
        fingerprint: data.fingerprint,
        gameId: data.gameId,
        canJoin: false
      })
    } else {
      this.socketUtil.emit(socket, "CanPlayerJoinResponse", {
        requestId: data.requestId,
        fingerprint: data.fingerprint,
        gameId: data.gameId,
        canJoin: true
      })
    }
  }

  onPlayerJoin(data, socket) {
    let playerIdentifier = [data.playerRemoteAddress, data.fingerprint].join("-")
    this.onlinePlayersByIp[playerIdentifier] = true
    this.onlinePlayersByHost[data.host] = this.onlinePlayersByHost[data.host] || {}
    this.onlinePlayersByHost[data.host][playerIdentifier] = true

    // let sector = this.getSector(data)   
    // if (sector) {
    //   sector.addPlayer(playerIdentifier)
    // }
  }

  onPlayerLeave(data, socket) {
    let playerIdentifier = [data.playerRemoteAddress, data.fingerprint].join("-")

     // let sector = this.getSector(data)   
     // if (sector) {
     //   sector.removePlayer(playerIdentifier)
     // }

    this.onlinePlayersByHost[data.host] = this.onlinePlayersByHost[data.host] || {}
    delete this.onlinePlayersByHost[data.host][playerIdentifier] 
    if (Object.keys(this.onlinePlayersByHost[data.host]).length === 0) {
      delete this.onlinePlayersByHost[data.host]
    }

    delete this.onlinePlayersByIp[playerIdentifier] 
  }

  onCreatorLeaveSector(data, socket) {
    let region = this.getRegion(data)
    if (!region) return

    region.unregisterPlayerCreateGame({ creatorIp: data.creatorIp, creatorUid: data.creatorUid })
  }

  onSectorStatus(data, socket) {
    let sector = this.getSector(data)
    sector.updateStatus(data)
  }

  formatLatencyProfile(latencyProfile) {
    let matchmakerRequest = (latencyProfile.matchmakerRequestGame - latencyProfile.start) / 1000
    let gameServerCreate  = (latencyProfile.gameCreated - latencyProfile.matchmakerRequestGame) / 1000

    return [
      `matchmakerRequest took ${matchmakerRequest}s`,
      `gameServerCreate took ${gameServerCreate}s`,
    ].join("\n")
  }

  onPvpGameCreateStatus(data) {
    let environment = this.getEnvironment()
    environment.forEachRegion((region) => {
      region.forEachNode((node) => {
        let isNodeMatch = node.servers[data.host]
        if (isNodeMatch) {
          node.onPvPServerCreated(data)
        }
      })
    })
  }

  async onGameCreateStatus(data, socket) {
    let requestId = data.requestId

    try {
      let success = data.success
      if (data.gameMode === 'pvp') {
        this.onPvpGameCreateStatus(data)
        return
      }
      let playerSocket = this.socketUtil.getSocket(data.socketId)
      if (!playerSocket) return

      let eventName 
      if (data.isBootSector) {
        eventName = "PlayerBootSectorStatus"
      } else if (data.isMiniGame) {
        eventName = "JoinMiniGameStatus"
      } else {
        eventName = "PlayerCreateSectorStatus"
      }
      
      let profile
      if (this.latencyProfiles[requestId]) {
        this.latencyProfiles[requestId]["gameCreated"] = Date.now()
        profile = this.formatLatencyProfile(this.latencyProfiles[requestId])
      }

      if (success) {
        if (data.isMiniGame) {
          let environment = this.getEnvironment()
          let region = environment.getMiniGamesRegion()
          let pendingSector = region.getPendingSectorForRequestId(data.sectorId, requestId)
          if (pendingSector) {
            pendingSector.onCreateSuccess({ success: true, host: data.host, sectorId: data.sectorId, profile: profile, sector: data.sector, isGameReady: data.isGameReady })
          }
        } else {
          this.socketUtil.emit(playerSocket, eventName, { success: true, host: data.host, sectorId: data.sectorId, profile: profile, sector: data.sector, isGameReady: data.isGameReady })
        }
      } else {
        if (data.isMiniGame) {
          let environment = this.getEnvironment()
          let region = environment.getMiniGamesRegion()
          let pendingSector = region.getPendingSectorForRequestId(data.sectorId, requestId)
          if (pendingSector) {
            pendingSector.onCreateError({ error: data.error })
          }
        } else {
          this.socketUtil.emit(playerSocket, eventName, { error: data.error })
        }

        if (eventName === "PlayerCreateSectorStatus") {
          // delete previously created sector by matchmaker since server game
          // failed to create
          LOG.info("Game create failed.")
          let sectorModel = await SectorModel.findOne({ 
            where: { uid: data.sectorId }
          })
          
          if (sectorModel) {
            await sectorModel.destroy()
          }
        }
      }
      delete this.latencyProfiles[requestId]
    } catch(e) {
      delete this.latencyProfiles[requestId]
      ExceptionReporter.captureException(e)
    }

  }

  getEnvironment() {
    return this.environments[global.env]
  }

  getRegion(data) {
    let environment = this.getEnvironment()
    if (!environment) return null

    return environment.getRegion(data.region)
  }

  getAlternateRegion(data) {
    let environment = this.getEnvironment()
    if (!environment) return null

    return environment.getAlternateRegion(data.region)
  }

  getNode(data) {
    let region
  }

  getServer(data) {
    let region = this.getRegion(data)
    if (!region) return null

    let nodeName = this.getNodeName(data.host)
    let node = region.getNode(nodeName)
    return node.getServer(data.host)
  }

  getSector(data) {
    let server = this.getServer(data)
    if (server) {
      return server.getSector(data.sectorId)
    }
  }

  onPlayerCountChanged(sector) {
  }

  /*
    region: "us-west", ip: 43.11.22.139, playerCount: 5
  */
  onSectorUpdated(data, socket) {
    let server = this.getServer(data)
    if (!server) {
      LOG.info("server not found onSectorUpdated: " + data.sectorId + " for host: " + data.host)
      return
    }

    let sector = server.getSector(data.sectorId)
    if (!sector) {
      sector = server.addSector(data)
    }

    sector.update(data)

    if (this.topColonies[data.sectorId]) {
      this.topColonies[data.sectorId].screenshot = Object.keys(data.screenshots)[0] // update screenshot
      this.topColonies[data.sectorId].isPrivate = data.isPrivate
    }
  }

  onSectorRemoved(data, socket) {
    let server = this.getServer(data)
    if (!server) return


    LOG.info("server " + socket.host + " removing sector: " + data.sectorId)

    server.removeSector(data.sectorId)  
  }

  onRoundStarted(data, socket) {
    let sector = this.getSector(data)
    if (!sector) return

    sector.setRoundStarted(true)  
  }

  getNodeName(host) {
    return host.replace(".junon.io", "").split(":")[0]
  }

  onHeartbeat(data, socket) {
    this.onServerUpdated(data, socket, true)
  }

  onServerUpdated(data, socket, isHeartbeat = false) {
    if (!socket.region) {
      socket.region = data.region
      socket.host = data.host
    }

    this.gameServerSockets[data.host] = socket

    let region = this.getRegion(data)
    if (!region) return

    let nodeName = this.getNodeName(data.host)

    let node = region.getNode(nodeName)
    if (!node) {
      node = region.addNode(nodeName)
    }

    let server = node.getServer(data.host)
    if (!server) {
      server = node.addServer(data)
      // LOG.debug("server " + socket.host + " added. isHeartbeat: " + isHeartbeat)
    }

    data.socket = socket
    server.update(data)
  }

  onGameServerDisconnect(socket) {
    try {
      delete this.gameServerSockets[socket.host]

      let region = this.getRegion({ region: socket.region })
      if (region && socket.host) {
        LOG.info("server " + socket.host + " disconnected. removing from registry")
        
        let nodeName = this.getNodeName(socket.host)
        let node = region.getNode(nodeName)
        node.removeServerByHost(socket.host)
      }
    } catch(e) {
      ExceptionReporter.captureException(e)
    }
  }

  onMatchFilter(data, socket) {
    let environment = this.getEnvironment(global.env)
    environment.forEachRegion((region) => {
      region.addSocket(socket)
    })
  }

  onGlobalClientChat(data, socket) {
    let region = this.getRegion({ region: socket.region })
    if (!region) return

    region.onGlobalClientChat(data)
  }

  onRequestChatHistory(data, socket) {
    let region = this.getRegion({ region: data.region })
    if (!region) return

    region.sendChatHistory(socket)  
  }

  onRequestSectorList(data, socket) {
    let environment = this.getEnvironment()

    let sectors = {}
    let regions = Object.values(environment.regions)
    regions.forEach((region) => {
      let json = region.getSectorsJson()
      for (let id in json) {
        sectors[id] = json[id]
      }
    })

    this.socketUtil.emit(socket, "SectorList", { region: 'nyc1', sectors: sectors })
  }

  async onGetSector(data, socket) {
    let environment = this.getEnvironment()
    let sector = environment.findSector(data.sectorId)
    if (sector) {
      this.socketUtil.emit(socket, "SectorInfo", { sector: sector.toJson() })
      return
    }

    let sectorModel = await SectorModel.findOne({ 
      where: { uid: data.sectorId }
    })

    if (sectorModel) {
      this.socketUtil.emit(socket, "SectorInfo", { sector: this.convertModelToSectorJson(sectorModel) })
      return
    }

    this.socketUtil.emit(socket, "SectorInfo", { sector: null })
  }

  convertModelToSectorJson(sectorModel) {
    let json = sectorModel.toJSON()
    json.sectorId = json.uid
    json.playerCount = 0 // since its from db and not from live matchmaker there are 0 players
    return json
  }

  onPing(data, socket) {
    this.socketUtil.emit(socket, "1", { })
  }

  initMiniGames() {
    let miniGames 
    if (env === 'development') {
      miniGames = {
        "eWC1CfZymRExY": {
          "name": "Find the Imposter",
          "playerCount": 0,
          "screenshot": "9f2495eb19ba4bc4868966567222b1e9",
          "creator": "kuroro"
        },
        "BPF0uFha5QLUr": {
          "name": "Domination",
          "playerCount": 0,
          "screenshot": "9f2495eb19ba4bc4868966567222b1e9",
          "creator": "kuroro"
        },
        "l8v7ezWMvnGeC": {
          "name": "Bed Wars",
          "playerCount": 0,
          "screenshot": "9f2495eb19ba4bc4868966567222b1e9",
          "creator": "Skylynx"
        },
        "vbj91eofmFCiu": {
          "name": "Tower Defense",
          "playerCount": 0,
          "screenshot": "9f2495eb19ba4bc4868966567222b1e9",
          "creator": "Starmancer"
        }
      }
    } else if (env === 'production' || env === 'staging') {
      miniGames = {
        "Ap9OYBkw3dQvJ": {
          "name": "Find the Imposter",
          "playerCount": 0,
          "screenshot": "496525db3d2d4607aa6be6d5c2bc9914",
          "creator": "kuroro"
        },
        "PnGkJd5xZsb0v": {
          "name": "Domination",
          "playerCount": 0,
          "screenshot": "5c5f724f3f4a46e7b17e72d221ea469d",
          "creator": "kuroro"
        },
        "uLHpXWb2koXYe": {
          "name": "Bed Wars",
          "playerCount": 0,
          "screenshot": "5c5f724f3f4a46e7b17e72d221ea469d",
          "creator": "Skylynx"
        },
        "YcdqgbswlAqRi": {
          "name": "Tower Defense",
          "playerCount": 0,
          "screenshot": "24d4016074a64542beacde94a96a0360",
          "creator": "Starmancer"
        }
      }
    }

    for (let id in miniGames) {
      let data = miniGames[id]
      data.id = id
      new MiniGame(this, data)
    }

  }

  getTotalOnlineCount() {
    let total = 0

    let environment = this.getEnvironment()
    for (let regionName in environment.regions) {
      let region = environment.regions[regionName]
      total += region.getPlayerCount()
    }

    return total
  }

  getOnlineCountByRegion() {
    let result = {}

    let environment = this.getEnvironment()
    for (let regionName in environment.regions) {
      let region = environment.regions[regionName]
      result[regionName] = region.getPlayerCount()
    }

    return result
  }

  /*
    send client list of servers by region (at least 4 per region for failover in case one becomes full)
    these must be not full
  */
  async onListServers(res, req) {
    try {
      let query = queryString.decode(req.getQuery())
      let environment = this.getEnvironment()
      let serversByRegion = environment.getOneServerByRegion()
      let totalOnlineCount = this.getTotalOnlineCount()
      let onlineCountByRegion = this.getOnlineCountByRegion()
      let miniGamesJson = this.getMiniGamesJson()

      res.end(JSON.stringify({ totalOnlineCount: totalOnlineCount, serversByRegion: serversByRegion, onlineCountByRegion: onlineCountByRegion, miniGames: miniGamesJson }))
    } catch (e) {
      ExceptionReporter.captureException(e)
      res.end(JSON.stringify({ error: "Unable to list servers" }))
    }
  }

  getMiniGame(id) {
    return this.miniGames[id]
  }

  getMiniGamesJson() {
    let result = {}

    for (let id in this.miniGames) {
      let miniGame = this.miniGames[id]
      result[id] = miniGame.toJson()
    }

    return result
  }

  async onRemovefriend(res, req) {
    this.readJson(res).then(async (body) => {
      try {
        if (!body.idToken) {
          let data = { error: "Missing idToken. Make sure you are properly logged in." }
          res.end(JSON.stringify(data))
          return
        }

        if (!body.friendUid) {
          let data = { error: "Missing friendUid" }
          res.end(JSON.stringify(data))
          return
        }

        let uid = await this.getUidFromRequest(body.idToken, body.uid)
        if (!uid) {
          let data = { error: "Invalid credentails." }
          res.end(JSON.stringify(data))
          return
        }

        let user = await User.findOne({ 
          where: { uid: uid }
        })

        if (!user) {
          let data = { error: "Invalid credentails. Player not found." }
          res.end(JSON.stringify(data))
          return
        }


        let friendship = await FriendModel.findOne({ 
          where: {
            [Op.or]: [
              { userUid: body.friendUid, friendUid: user.uid },
              { userUid: user.uid, friendUid: body.friendUid }
            ]
          },
        })

        if (!friendship) {
          let data = { error: "No such friend" }
          res.end(JSON.stringify(data))
          return
        }

        await friendship.destroy() 

        let data = { success: "Removed Friend", friendUid: body.friendUid }
        res.end(JSON.stringify(data))
      } catch(e) {
        ExceptionReporter.captureException(e)
        let data = { error: "Invalid friend removal" }
        res.end(JSON.stringify(data))
      }
    })
  }

  async onFriendRequest(res, req) {
    this.readJson(res).then(async (body) => {
      try {
        if (!body.idToken) {
          let data = { error: "Missing idToken. Make sure you are properly logged in." }
          res.end(JSON.stringify(data))
          return
        }

        if (!body.friendUid) {
          let data = { error: "Missing friendUid" }
          res.end(JSON.stringify(data))
          return
        }

        let targetUser = await User.findOne({ 
          where: { uid: body.friendUid }
        })

        if (!targetUser) {
          let data = { error: "No such player" }
          res.end(JSON.stringify(data))
          return
        }

        let uid = await this.getUidFromRequest(body.idToken, body.uid)
        if (!uid) {
          let data = { error: "Invalid credentails." }
          res.end(JSON.stringify(data))
          return
        }

        let user = await User.findOne({ 
          where: { uid: uid }
        })

        if (!user) {
          let data = { error: "Invalid credentails. Player not found." }
          res.end(JSON.stringify(data))
          return
        }

        let existingFriend = await FriendModel.findOne({ 
          where: { userUid: uid, friendUid: targetUser.uid }
        })

        if (existingFriend) {
          let data = { error: "Invalid request." }
          res.end(JSON.stringify(data))
          return
        }

        let friend = await FriendModel.createOne({ userUid: uid, friendUid: targetUser.uid, status: "requested" })
        let result = friend.toJSON()
        result.success = "Friend requested"
        result.sender =  { username: user.username }
        result.receiver =  { username: targetUser.username }

        res.end(JSON.stringify(result))

        this.onFriendRequestSuccessful(result)

      } catch(e) {
        ExceptionReporter.captureException(e)
        let data = { error: "Invalid friend request" }
        res.end(JSON.stringify(data))
      }
    })
  }

  onFriendRequestSuccessful(result) {
    let receiverUid = result.friendUid
    let senderUid = result.userUid
    let senderName = result.sender.username
    
    if (this.onlinePlayers[receiverUid]) {
      let socket = this.onlinePlayers[receiverUid]
      this.socketUtil.emit(socket, "FriendRequest", result)
    }
  }

  async onAcceptFriendRequest(res, req) {
    this.readJson(res).then(async (body) => {
      try {
        if (!body.idToken) {
          let data = { error: "Missing idToken. Make sure you are properly logged in." }
          res.end(JSON.stringify(data))
          return
        }

        if (!body.requestId) {
          let data = { error: "No such friend request" }
          res.end(JSON.stringify(data))
          return
        }

        let friendRequest = await FriendModel.findOne({ 
          where: { id: body.requestId }
        })

        if (!friendRequest.status === "requested") {
          let data = { error: "No such pending request" }
          res.end(JSON.stringify(data))
          return
        }

        let uid = await this.getUidFromRequest(body.idToken, body.uid)
        if (!uid) {
          let data = { error: "Invalid credentails." }
          res.end(JSON.stringify(data))
          return
        }

        let isFriendRequestPresent = friendRequest.friendUid === uid
        if (!isFriendRequestPresent) {
          let data = { error: "Cant find friend request" }
          res.end(JSON.stringify(data))
          return
        }

        friendRequest.status = "accepted"
        await friendRequest.save()

        let user = await User.findOne({ 
          where: { uid: uid }
        })

        let result = friendRequest.toJSON()
        result.receiver =  { username: user.username }

        let data = { success: "Accepted Friend request", requestId: friendRequest.id }
        res.end(JSON.stringify(data))

        this.notifyFriendshipAccepted(result)
      } catch(e) {
        ExceptionReporter.captureException(e)
        let data = { error: "Invalid friend request" }
        res.end(JSON.stringify(data))
      }
    })
  }

  notifyFriendshipAccepted(friendRequest) {
    let socket = this.onlinePlayers[friendRequest.userUid]
    if (socket) {
      this.socketUtil.emit(socket, "FriendAccepted", friendRequest)
    }
  }

  async onIgnoreFriendRequest(res, req) {
    this.readJson(res).then(async (body) => {
      try {
        if (!body.idToken) {
          let data = { error: "Missing idToken. Make sure you are properly logged in." }
          res.end(JSON.stringify(data))
          return
        }

        if (!body.requestId) {
          let data = { error: "No such friend request" }
          res.end(JSON.stringify(data))
          return
        }

        let friendRequest = await FriendModel.findOne({ 
          where: { id: body.requestId }
        })

        if (!friendRequest.status === "requested") {
          let data = { error: "No such pending request" }
          res.end(JSON.stringify(data))
          return
        }

        let uid = await this.getUidFromRequest(body.idToken, body.uid)
        if (!uid) {
          let data = { error: "Invalid credentails." }
          res.end(JSON.stringify(data))
          return
        }

        let isFriendRequestPresent = friendRequest.friendUid === uid
        if (!isFriendRequestPresent) {
          let data = { error: "Cant find friend request" }
          res.end(JSON.stringify(data))
          return
        }

        friendRequest.status = "ignored"
        await friendRequest.save()

        let data = { success: "Ignored Friend request", requestId: friendRequest.id }
        res.end(JSON.stringify(data))
      } catch(e) {
        ExceptionReporter.captureException(e)
        let data = { error: "Invalid friend request" }
        res.end(JSON.stringify(data))
      }
    })
  }


  async onSearch(res, req) {
    try {
      res.onAborted(() => {
        console.log('Search aborted')
      })

      let query = queryString.decode(req.getQuery())
      let sectorName = query.q 
      if (!sectorName) {
        res.end(JSON.stringify([]))
        return
      }

      let now = new Date()
      let lastYearDate = new Date(now - (1000 * 60 * 60 * 24 * 7 * 4 * 12))

      let sectorList = await SectorModel.findAll({
        where: { 
          name: {
            [Op.substring]: sectorName
          },
          updatedAt: {
            [Op.gte]: lastYearDate 
          },
          creatorUid: {
            [Op.ne]: null
          },
          isPrivate: {
            [Op.ne]: true
          }
        },
        order: [['daysAlive', 'DESC']],
        limit: 50
      })

      let sectorsJson = sectorList.map((model) => {
        return model.toJSON()
      })

      res.end(JSON.stringify(sectorsJson))
    } catch(e) {
      ExceptionReporter.captureException(e)
      res.end(JSON.stringify({ error: "Unable to check server status" }))
    }
  }

  isImportInProgress(sectorUid) {
    if (!this.currentImports[sectorUid]) return false

    let fiveMinutes = 1000 * 60 * 5
    let timeElapsed = Date.now() - this.currentImports[sectorUid]
    if (timeElapsed > fiveMinutes) {
      // something went wrong with import, remove
      delete this.currentImports[sectorUid]
      return false
    }

    return true
  }

  // https://github.com/uNetworking/uWebSockets.js/discussions/106
  onImportSector(res, req) {
    try {
      let userUid
      let idToken
      let sectorUid

      req.forEach((k, v) => {
        if (k === "token") {
          idToken = v
        } else if (k === 'sector') {
          sectorUid = v
        } else if (k === 'uid') {
          userUid = v
        }
      });
 
      res.onAborted(() => {
        if (this.currentImports[sectorUid]) {
          delete this.currentImports[sectorUid]
        }
      })

      let buffer = Buffer.alloc(0)
      res.onData((ab, isLast) => {
          const chunk = Buffer.from(ab);
          buffer = Buffer.concat([buffer, chunk]);
          if (isLast) {
            let saveData = buffer

            this.performSectorImport(res, req, {
              idToken: idToken,
              sectorUid: sectorUid,
              saveData: saveData,
              uid: userUid
            })
          }
      })
    } catch(e) {
      ExceptionReporter.captureException(e)
      res.end(JSON.stringify({ error: "Unable to export sector" }))
    }
  }

  async performSectorImport(res, req, options) {
    let sectorUid
    try {
      let idToken = options.idToken
      sectorUid = options.sectorUid
      let saveData = options.saveData
      let userUid = options.uid

      let magicNumber = saveData.slice(0,2).toString('HEX')
      let isGzip = magicNumber == "1f8b"
      if (!isGzip) {
        let data = { error: "Invalid save format" }
        res.end(JSON.stringify(data))
        return
      }

      if (!idToken) {
        let data = { error: "Missing idToken. Make sure you are properly logged in." }
        res.end(JSON.stringify(data))
        return
      }
 
      let uid = await this.getUidFromRequest(idToken, userUid)
      if (!uid) {
        let data = { error: "Invalid credentails." }
        res.end(JSON.stringify(data))
        return
      }
 
      let user = await User.findOne({ 
        where: {uid: uid},
        include: [
          { model: SectorModel, as: 'saves' },
        ]
      })

      if (!user) {
        let data = { error: "User not found" }
        res.end(JSON.stringify(data))
        return 
      }
 
      // check if sector is already online, can't have two instances (save file overwrite each other..)
      let onlineSector = this.getEnvironment().getExistingSector(sectorUid)
      if (onlineSector) {
        let data = { error: "World must be offline in order to upload a new save file." }
        res.end(JSON.stringify(data))
        return
      }
 
      this.clearUserImportCount(user)
 
      if (this.hasReachedMaxImportCount(user)) {
        let data = { error: "Your uploading too many times. Wait 5 more minutes." }
        res.end(JSON.stringify(data))
        return
      }
 
      this.currentImports[sectorUid] = Date.now()
      this.increaseUserImportCount(user)

      let targetSector = user.saves.find((save) => {
        return save.uid === sectorUid
      })

      if (!targetSector) {
        delete this.currentImports[sectorUid]
        let data = { error: "Invalid sector." }
        res.end(JSON.stringify(data))
        return
      }

      let buffer = await WorldSerializer.decompressGzip(saveData)
      let version = WorldSerializer.parseSaveFileVersion(buffer)
      let sectorData = WorldSerializer.parseSaveGame(buffer, version)
      let sourceGameMode = sectorData.metadata.gameMode
      if (sourceGameMode === "survival") {
        delete this.currentImports[sectorUid]
        let data = { error: `Not allowed to import Survival sector save file` }
        res.end(JSON.stringify(data))
        return
      }

      if (sourceGameMode !== targetSector.gameMode) {
        delete this.currentImports[sectorUid]
        let data = { error: `Not allowed to import incompatible game mode saves` }
        res.end(JSON.stringify(data))
        return
      }

      // var arrayBuffer = new Uint8Array(saveData).buffer;
      WorldSerializer.upload(sectorUid, saveData, () => {
        delete this.currentImports[sectorUid]
        console.log("Uploaded ..." + sectorUid)
        let data = { success: "Upload success" }
        res.end(JSON.stringify(data));
      })
    } catch(e) {
      delete this.currentImports[sectorUid]
      ExceptionReporter.captureException(e)
      res.end(JSON.stringify({ error: "Unable to import sector" }))
    }
  }

  async onExportSector(res, req) {
    try {
      let readStream

      /* If you plan to asyncronously respond later on, you MUST listen to onAborted BEFORE returning */
      res.onAborted(() => {
        this.onAbortedOrFinishedResponse(res, readStream);
      });

      let query = queryString.decode(req.getQuery())
      let sectorUid = query.sectorUid

      if (!sectorUid) {
        let data = { error: "Missing sectorUid" }
        res.end(JSON.stringify(data))
        return
      }

      if (!query.idToken) {
        let data = { error: "Missing idToken. Make sure you are properly logged in." }
        res.end(JSON.stringify(data))
        return
      }

      let uid = await this.getUidFromRequest(query.idToken, query.uid)
      if (!uid) {
        let data = { error: "Invalid credentails." }
        res.end(JSON.stringify(data))
        return
      }

      let user = await User.findOne({ 
        where: {uid: uid},
        include: [
          { model: SectorModel, as: 'saves' },
        ]
      })

      let targetSector = user.saves.find((save) => {
        return save.uid === sectorUid
      })

      if (!targetSector) {
        let data = { error: "Invalid sector." }
        res.end(JSON.stringify(data))
        return
      }

      this.clearUserExportCount(user)

      if (this.hasReachedMaxExportCount(user)) {
        let data = { error: "Your saving too many times. Wait 10 more minutes." }
        res.end(JSON.stringify(data))
        return
      }

      this.increaseUserExportCount(user)

      let fileName = targetSector.name + ".junon"

      res.writeHeader('Content-Type','application/octet-stream')
      res.writeHeader('Content-Disposition',`attachment; filename="${fileName}"`)

      let buffer = await WorldSerializer.readFile(sectorUid)
      res.end(buffer)

      // this.pipeStreamOverResponse(res, readStream, totalSize);
    } catch(e) {
      ExceptionReporter.captureException(e)
      res.end(JSON.stringify({ error: "Unable to export sector" }))
    }
  }

  hasReachedMaxExportCount(user) {
    if (!this.exportsByUser[user.uid]) return false

    return this.exportsByUser[user.uid].count > 15
  }

  clearUserExportCount(user) {
    if (!this.exportsByUser[user.uid]) return

    let timeElapsed = Date.now() - this.exportsByUser[user.uid].firstExportTime
    let fiveMinutes = 1000 * 60 * 5

    if (timeElapsed > fiveMinutes) {
      this.exportsByUser[user.uid] = {
        firstExportTime: Date.now(),
        count: 0
      }
    }
  }

  hasReachedMaxImportCount(user) {
    if (!this.importsByUser[user.uid]) return false

    return this.importsByUser[user.uid].count > 10
  }

  clearUserImportCount(user) {
    if (!this.importsByUser[user.uid]) return

    let timeElapsed = Date.now() - this.importsByUser[user.uid].firstImportTime
    let fiveMinutes = 1000 * 60 * 5

    if (timeElapsed > fiveMinutes) {
      this.importsByUser[user.uid] = {
        firstImportTime: Date.now(),
        count: 0
      }
    }
  }

  increaseUserImportCount(user) {
    this.importsByUser[user.uid] = this.importsByUser[user.uid] || {
      firstImportTime: Date.now(),
      count: 1
    }

    this.importsByUser[user.uid].count += 1
  }

  increaseUserExportCount(user) {
    this.exportsByUser[user.uid] = this.exportsByUser[user.uid] || {
      firstExportTime: Date.now(),
      count: 1
    }

    this.exportsByUser[user.uid].count += 1
  }

  onAbortedOrFinishedResponse(res, readStream) {
    if (res.id == -1) {
      console.log("ERROR! onAbortedOrFinishedResponse called twice for the same res!");
    } else {
      if (readStream) {
        readStream.destroy();
      }
    }

    /* Mark this response already accounted for */
    res.id = -1;
  }

  // https://github.com/uNetworking/uWebSockets.js/blob/90e4d930f39e3e743fc69966eb795f409ab73e1a/examples/VideoStreamer.js#L38
  pipeStreamOverResponse(res, readStream, totalSize) {
    /* Careful! If Node.js would emit error before the first res.tryEnd, res will hang and never time out */
    /* For this demo, I skipped checking for Node.js errors, you are free to PR fixes to this example */
    readStream.on('data', (chunk) => {
      /* We only take standard V8 units of data */
      const ab = toArrayBuffer(chunk);

      /* Store where we are, globally, in our response */
      let lastOffset = res.getWriteOffset();

      /* Streaming a chunk returns whether that chunk was sent, and if that chunk was last */
      let [ok, done] = res.tryEnd(ab, totalSize);

      /* Did we successfully send last chunk? */
      if (done) {
        this.onAbortedOrFinishedResponse(res, readStream);
      } else if (!ok) {
        /* If we could not send this chunk, pause */
        readStream.pause();

        /* Save unsent chunk for when we can send it */
        res.ab = ab;
        res.abOffset = lastOffset;

        /* Register async handlers for drainage */
        res.onWritable((offset) => {
          /* Here the timeout is off, we can spend as much time before calling tryEnd we want to */

          /* On failure the timeout will start */
          let [ok, done] = res.tryEnd(res.ab.slice(offset - res.abOffset), totalSize);
          if (done) {
            this.onAbortedOrFinishedResponse(res, readStream);
          } else if (ok) {
            /* We sent a chunk and it was not the last one, so let's resume reading.
             * Timeout is still disabled, so we can spend any amount of time waiting
             * for more chunks to send. */
            readStream.resume();
          }

          /* We always have to return true/false in onWritable.
           * If you did not send anything, return true for success. */
          return ok;
        });
      }

    }).on('error', () => {
      /* Todo: handle errors of the stream, probably good to simply close the response */
      console.log('Unhandled read error from Node.js, you need to handle this!');
    });
  }

  async onSearchPlayer(res, req) {
    try {
      res.onAborted(() => {
        console.log('Search aborted')
      })

      let query = queryString.decode(req.getQuery())
      let playerName = query.q 
      if (!playerName) {
        res.end(JSON.stringify([]))
        return
      }

      playerName = playerName.replace(/\_/g, "\\_")

      let userList = await User.findAll({
        where: { 
          username: {
            [Op.substring]: playerName
          },
          isFriendRequestAllowed: {
            [Op.ne]: false
          },
        },
        limit: 50
      })

      let usersJson = userList.map((model) => {
        return {
          uid: model.uid,
          username: model.username
        }
      })

      res.end(JSON.stringify(usersJson))
    } catch(e) {
      ExceptionReporter.captureException(e)
      res.end(JSON.stringify({ error: "Unable to check server status" }))
    }
  }


  async onBanList(res, req) {
    try {
      res.onAborted(() => {
        console.log('Ban list aborted')
      })

      let query = queryString.decode(req.getQuery())

      let isMod = await this.isMod(query.idToken, query.uid)
      if (!isMod) {
        let data = { error: "Invalid credentails." }
        res.end(JSON.stringify(data))
        return
      }

      let ipBanList = await IpBan.findAll({ attributes: ['ip', 'username', 'reason', 'dayCount', 'createdAt'] })

      let result = []
      for (var i = 0; i < ipBanList.length; i++) {
        let ipBan = ipBanList[i]
        result.push({
          ip: ipBan.ip,
          username: ipBan.username,
          dayCount: ipBan.dayCount,
          reason: ipBan.reason,
          createdAt: ipBan.createdAt
        })
      }

      res.end(JSON.stringify({ success: result }))
    } catch(e) {
      ExceptionReporter.captureException(e)
      res.end(JSON.stringify({ error: "Unable to check server status" }))
    }
  }

  async onServerStatus(res, req) {
    try {
      let result = {}

      let environment = this.getEnvironment()
      environment.forEachRegion((region) => {
        result[region.name] = result[region.name] || {}
        region.forEachNode((node) => {
          let nodeName = node.name 
          result[region.name][nodeName] = result[region.name][nodeName] || {}
          result[region.name][nodeName].revision = node.revision
          result[region.name][nodeName].servers = result[region.name][nodeName].servers || {}

          node.forEachServer((server) => {
            let hostName = server.host 
            result[region.name][nodeName].servers[hostName] = server.getStatusData()
          })
        })
      })

      res.end(JSON.stringify(result))
    } catch (e) {
      ExceptionReporter.captureException(e)
      res.end(JSON.stringify({ error: "Unable to check server status" }))
    }
  }

  isBadWord(text) {
    return BadWordsFilter.isBadWord(text)
  }

  readJson(res) {
    return new Promise((resolve, reject) => {
      let buffer

      res.onData((ab, isLast) => {
        let chunk = Buffer.from(ab);
        if (isLast) {
          let json;
          if (buffer) {
            try {
              json = JSON.parse(Buffer.concat([buffer, chunk]));
            } catch (e) {
              /* res.close calls onAborted */
              ExceptionReporter.captureException(e)
              res.close();
              return;
            }
            resolve(json);
          } else if (chunk.length > 0) {
            try {
              json = JSON.parse(chunk);
            } catch (e) {
              /* res.close calls onAborted */
              ExceptionReporter.captureException(e)
              res.close();
              return;
            }
            resolve(json);
          }
        } else {
          if (buffer) {
            buffer = Buffer.concat([buffer, chunk]);
          } else {
            buffer = Buffer.concat([chunk]);
          }
        }
      });

      res.onAborted(() => {
        /* Request was prematurely aborted or invalid or missing, stop reading */
        console.log('Invalid JSON or no data at all!')
      })

    })
  }


}

let isCalledDirectly = require.main === module
if (isCalledDirectly) {
  if (debugMode) {
    require("dns").lookup("www.google.com", (err) => {
      if (err) {
        global.isOffline = true
      }

      global.server = new MatchmakerServer()
      global.server.run()
    })
  } else {
    global.server = new MatchmakerServer()
    global.server.run()
  }
}


module.exports = MatchmakerServer