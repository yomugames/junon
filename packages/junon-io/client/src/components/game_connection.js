const Cookies = require("js-cookie")
const SocketUtil = require("../util/socket_util")
const ClientHelper = require("../util/client_helper")
const SteamSocket = require("../util/steam_socket")

class GameConnection {

  // options.authorize: async () => the URL to open, for each connection
  // attempt (co-op guests; see util/coop_auth.js)
  constructor(url, options = {}) {
    this.url = url
    this.authorize = options.authorize

    this.reconnectAttemptCount = 0
    this.isFirstSocketSetup = true
    this.reconnectDelay = 5
  }

  init(options) {
    this.initWebsocket(options)
  }

  close() {
    this.isTerminated = true
    if (this.socket) {
      this.socket.close()
    }
    
  }

  setGame(game) {
    this.game = game
  }

  getSector() {
    return this.game.sector
  }

  initWebsocket(options) {
    this.websocketSetupTime = (new Date()).getTime()

    this.setupSocket(options)
  }

  async setupSocket(callback) {
    let url = this.url
    if (this.authorize) {
      try {
        url = await this.authorize()
      } catch (e) {
        // the same paths as a socket that failed to open
        if (this.isFirstSocketSetup) {
          if (callback.error) callback.error(true)
        } else {
          this.onSocketDisconnect()
        }
        return false
      }
    }

    // steam:<id> URLs are Steam co-op hosts, reached through the desktop app
    this.socket = SteamSocket.isSteamUrl(url) ? new SteamSocket(url) : new WebSocket(url)
    this.socket.binaryType = "arraybuffer"

    this.socket.onopen = () => {
      if (this.isFirstSocketSetup) {
        this.isFirstSocketSetup = false
        let selfTime = (new Date()).getTime() - this.websocketSetupTime
        console.log("connected to: " + this.url + " took " + (selfTime / 1000).toFixed(1) + " seconds")
      }

      if (callback.success) callback.success(this.socket)
    }

    // a Steam socket says why it failed, e.g. a version mismatch
    this.socket.onerror = (event) => {
      let wasNeverConnected = this.isFirstSocketSetup
      if (callback.error) callback.error(wasNeverConnected, event && event.reason)
    }

    this.socket.onclose = this.onSocketDisconnect.bind(this)
    return true
  }

  onSocketDisconnect(event) {
    if (this.isFirstSocketSetup) return
    if (this.isTerminated) return

    this.game.stopAllBackgroundMusic()

    if (this.game.isAFK) {
      this.displayDisconnected()
      return
    }

    let serverIp = this.getServerIp()

    const inFiveMinutes = new Date(new Date().getTime() + 5 * 60 * 1000)
    Cookies.set("server_ip", serverIp, { expires: inFiveMinutes })

    const delay = (this.reconnectAttemptCount + 1) * this.reconnectDelay
    if (this.reconnectAttemptCount > 4) {
      this.displayDisconnected()
    } else if (this.game.isServerShutdownInProgress) {
      this.displayDisconnected()
    } else {
      this.attemptReconnect(delay)
    }
  }

  getServerIp() {
    // co-op URLs carry the join password in the query
    return this.url.split("?")[0].replace(/ws.*\//,"")
  }

  getDots(reloadIncrement) {
    let progress = (reloadIncrement % 3) + 1

    let dots = ""
    for (var i = 0; i < progress; i++) {
      dots += "."
    }

    return dots
  }

  displayReload() {
    this.reloadIncrement = this.reloadIncrement || 0
    let dots = this.getDots(this.reloadIncrement)

    const message    = document.querySelector(".disconnected_msg")
    message.style.display = 'block'
    message.innerText = "Server restart in progress" + dots
    this.reloadIncrement += 1
  }

  displayDisconnected() {
    const message    = document.querySelector(".disconnected_msg")
    message.style.display = 'block'
    message.innerText = "Disconnected from server. Reload to reconnect"
  }

  displayRemoved() {
    const message    = document.querySelector(".disconnected_msg")
    message.style.display = 'block'
    message.innerText = "Removed from game as you have a new connection active"
  }

  isConnected() {
    if (!this.socket) return false
    return this.socket.readyState === WebSocket.OPEN        
  }

  attemptReconnect(delay) {
    const message    = document.querySelector(".disconnected_msg")
    message.style.display = 'block'

    let countdown = delay

    clearInterval(this.reconnectCountdownInterval)
    this.reconnectCountdownInterval = setInterval(() => {
      const countdownEl = document.querySelector(".reconnect_countdown")
      if (!countdownEl) {
        clearInterval(this.reconnectCountdownInterval)
        return
      }

      countdownEl.innerText = countdown
      countdown -= 1
      if (countdown <= 0) {
        clearInterval(this.reconnectCountdownInterval)
      }
    }, 1000)

    let reconnect = this.reconnectWebsocket.bind(this, { success: this.resumeGame.bind(this) })
    setTimeout(reconnect, delay * 1000)
  }

  resumeGame(sectorId, teamId) {
    this.reconnectAttemptCount = 0

    this.game.resumeGame()
  }

  onSessionResume() {
    console.log("session resumed..")
    document.querySelector(".disconnected_msg").style.display = 'none'
  }

  async reconnectWebsocket(callback) {
    console.log("Reconnecting...")

    this.reconnectAttemptCount += 1
    // a co-op guest's new socket only exists once its URL is authorized
    let isSocketCreated = await this.setupSocket(callback)
    if (isSocketCreated) this.game.reinitConnection()
  }

}

module.exports = GameConnection