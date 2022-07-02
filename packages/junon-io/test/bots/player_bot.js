const SocketUtil = require('./../../client/src/util/socket_util')
const Protocol = require('./../../common/util/protocol')
const Constants = require('./../../common/constants')
const Config = require("junon-common/config")
const base64id = require('base64id')

global.WebSocket = require('ws')

let botCount = 0

class PlayerBot {
  constructor(sectorId) {
    botCount += 1
    this.id = "@bot_" + this.createShortId()
    this.username = this.id

    this.screenWidth = 1280
    this.screenHeight = 800

    this.socketUtil = new SocketUtil()
    this.MATCHMAKER_WEBSOCKET_URL = Config[env].matchmakerWebsocketUrl

  }


  createShortId() {
    return base64id.generateId().replace(/-/g,"_").substr(0,10)
  }

  createGame(region) {
    console.log(this.id + " requesting NewColony")
    let data = {
      region: region,
      stress: true,
      sessionId: this.createShortId()
    }

    this.sendToMatchmaker({event: "NewColony", data: data})
  }

  requestSectorList() {
    this.sendToMatchmaker({event: "RequestSectorList"})
  }

  bootGame(region, sectorId) {
    this.bootTime = Date.now()

    console.log(this.id + " booting " + sectorId)
    let data = {
      region: region,
      stress: true,
      sectorId: sectorId,
      sessionId: this.createShortId()
    }

    this.sendToMatchmaker({event: "BootSector", data: data})
  }

  sendToMatchmaker(json) {
    this.matchmakerSocket.send(JSON.stringify(json))
  }

  joinGameServer(url, options = {}) {
    this.setupWebsocket(url, () => {
      let data = {
        username: this.username, 
        screenWidth: this.screenWidth, 
        screenHeight: this.screenHeight,
        isTroubleshooter: true
      }

      if (options.sectorId) {
        data.sectorId = options.sectorId
      } else {
        data.sectorId = "test_bot"
      }
      
      this.socketUtil.emit("RequestGame", data)
      
    })
  }

  connectToMatchmaker() {
    this.matchmakerSocket = new WebSocket(this.MATCHMAKER_WEBSOCKET_URL)

    return new Promise((resolve, reject) => {
      this.matchmakerSocket.onopen = () => {
        // console.log(this.id + " connected to matchmaker: " + this.MATCHMAKER_WEBSOCKET_URL)

        resolve({})
      }

      this.matchmakerSocket.onmessage = this.onMatchmakerMessage.bind(this)

      this.matchmakerSocket.onerror = () => {
        resolve({ error: true })
      }

      this.matchmakerSocket.onclose = this.onMatchmakerSocketDisconnect.bind(this)
    })
  }

  onMatchmakerSocketDisconnect() {
    console.log(this.id + " disconnected from matchmaker")
  }

  onMatchmakerMessage(event) {
    let message = JSON.parse(event.data)

    switch(message.event) {
      // ping back from matchamerk
      case "SectorList":
        this.onSectorList(message.data)
        break
      case "PlayerBootSectorStatus":
        this.onPlayerBootSectorStatus(message.data)
        break
      case "PlayerCreateSectorStatus":
        this.onPlayerCreateSectorStatus(message.data)
        break
    }
  }

  setOnSectorListListener(cb) {
    this.onSectorListListener = cb
  }

  onSectorList(data) {
    this.onSectorListListener(data)
  }

  onPlayerBootSectorStatus(data) {
    if (data.error) {
      console.log(this.id + " failed to boot " + data.error)
    } else {
      if (data.isGameReady) {
        let url  = this.getServerWebsocketUrl(data.host)
        let bootDuration = Math.floor((Date.now() - this.bootTime)/1000)
        console.log(this.id + " finished booting " + data.sectorId + " " + bootDuration + "s")
        this.joinGameServer(url, { sectorId: data.sectorId })
      }
    }
  }

  async onPlayerCreateSectorStatus(data) {
    if (data.error) {
      this.onPlayerCantJoin({ message: data.error })
    } else {
      let url  = this.getServerWebsocketUrl(data.host)
      this.joinGameServer(url, { sectorId: data.sectorId })
    }
  }

  getServerWebsocketUrl(ip) {
    let protocol = this.isHttps() ? "wss://" : "ws://"
    return protocol + ip
  }

  isHttps() {
    if (env === "staging" || env === "production") return true
    return false
  }

  setupWebsocket(url, onReady) {
    Protocol.initServer(() => {
      this.connectToServer(url, () => {
        this.socketUtil.init({ protocol: Protocol.protocol, allowMissingHandlers: true })
        this.socketUtil.setSocket(this.socket)
        this.initSocketHandlers()
        onReady()
      })
    })
  }

  run() {
    this.socketUtil.emit("Ping", {})
  }

  onPlayerJoined(data) {
    console.log(this.id + " joined..")

    this.runInterval = setInterval(this.run.bind(this), 3000)
  }

  leaveGame() {
    clearInterval(this.runInterval)
    this.socketUtil.emit("LeaveGame", {})
    console.log(this.id + " leave game..")
  }

  initSocketHandlers() {
    // SocketUtil.on("GameState", this.onSyncWithServer.bind(this))
    this.socketUtil.on("JoinGame", this.onPlayerJoined.bind(this))
    this.socketUtil.on("CantJoin", this.onPlayerCantJoin.bind(this))
  }

  onPlayerCantJoin(data) {
    console.log(this.username + " cant join server. " + data.message)
  }

  connectToServer(url, onReady) {
    this.socket = new WebSocket(url, {
      rejectUnauthorized: false
    })

    this.socket.on('open', () => {
      console.log(this.id + " connected to " + url)
      onReady()
    });

    this.socket.on('close', () => {
      console.log("closed socket")
    });

    this.socket.on('error', (err) => {
      console.log(err)
      console.log("error socket")
    });

  }

}

module.exports = PlayerBot