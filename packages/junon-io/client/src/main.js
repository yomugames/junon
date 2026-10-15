window.debugMode = env === "development" || env === "test"
window.socket = null

const SocketUtil = require("./util/socket_util")
const Game = require("./entities/game")
const SettingsMenu = require("./components/settings_menu")
const GameConnection = require("./components/game_connection")
const isMobile = require('ismobilejs')
const Cookies = require("js-cookie")
const { v4: uuidv4 } = require('uuid')
const LocalProfile = require('./util/local_profile')
const LocalWorldMenu = require('./components/local_world_menu')
const Polyglot = require('node-polyglot')
const japaneseTranslationMap = require("../../common/translations/ja")
const englishTranslationMap = require("../../common/translations/en")
const russianTranslationMap = require("../../common/translations/ru")
const ObjectPool = require("../../common/entities/object_pool")
const Lighting = require("./entities/lighting")
const Particles = require("./entities/particles/index")
const BitmapText = require("./util/bitmap_text")
const Projectiles = require("./entities/projectiles/index")
const Helper = require("../../common/helper")
const SpritePoolInstance = require("./entities/sprite_pool_instance")

const LANGUAGE_STORAGE_KEY = "junon_language"

require('url-search-params-polyfill')

require("./util/polyfills")

class Main {
  isWebGLSupported() {
    if (typeof this.webGlSupported !== 'undefined') return this.webGlSupported

    var contextOptions = { stencil: true };

    try {
        if (!window.WebGLRenderingContext) {
            this.webGlSupported = false
        }

        var canvas = document.createElement('canvas');
        var gl = canvas.getContext('webgl', contextOptions) || canvas.getContext('experimental-webgl', contextOptions);

        var success = !!(gl && gl.getContextAttributes().stencil);

        if (gl) {
            var loseContext = gl.getExtension('WEBGL_lose_context');

            if (loseContext) {
                loseContext.loseContext();
            }
        }

        gl = null;

        this.webGlSupported = success;
    } catch (e) {
        this.webGlSupported = false;
    }

    return this.webGlSupported
  }

  checkWebGLSupport() {
    if (!this.isWebGLSupported()) {
      document.querySelector("#connecting_message").style.display = 'none'
      document.querySelector("#home_error_message").innerText = "Your browser doesn't have proper WebGL support"
      return false
    }

    return true
  }

  initPools() {
    this.poolManager = ObjectPool

    ObjectPool.create("Lighting", Lighting)
    ObjectPool.create("Trail", Particles.Trail)
    ObjectPool.create("Meteor", Particles.Meteor)
    ObjectPool.create("BitmapText", BitmapText)
    ObjectPool.create("Smoke", Particles.Smoke)
    ObjectPool.create("Sprite", SpritePoolInstance)
  }

  initTranslation() {
    window.language = window.location.pathname.split("/")[1]
    if (window.language.length === 0) {
      let savedLanguage = this.getSavedLanguage()
      if (savedLanguage && savedLanguage !== 'en') {
        this.navigateToLanguage(savedLanguage)
      } else {
        window.language = 'en'
      }
    }

    window.isForeignLanguage = language !== 'en'
    document.getElementById("language_select").value = window.language

    let phrases = englishTranslationMap

    if (language.length > 0) {
      if (language === "ja") {
        phrases = Object.assign({}, phrases, japaneseTranslationMap)
      } else if (language === "ru") {
        phrases = Object.assign({}, phrases, russianTranslationMap)
      }
    }

    let i18n = new Polyglot({
      phrases: phrases,
      allowMissing: true
    })
    window.i18n = i18n
  }

  onLanguageSelectChange(e) {
    let selectedLanguage = e.target.value
    if (selectedLanguage !== window.language) {
      this.saveLanguage(selectedLanguage)
      this.navigateToLanguage(selectedLanguage)
    }
  }

  // localStorage, not a cookie: the desktop app's app:// pages can't store
  // cookies, and its fixed origin keeps localStorage (as for the local
  // profile). Browsers may still have the older cookie.
  getSavedLanguage() {
    try {
      return localStorage.getItem(LANGUAGE_STORAGE_KEY) || Cookies.get("language")
    } catch(e) {
      return Cookies.get("language")
    }
  }

  saveLanguage(language) {
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, language)
    } catch(e) {
      Cookies.set("language", language)
    }
  }

  navigateToLanguage(language) {
    window.location.href = "/" + language + "/" + window.location.search
  }

  isBrowserSupported() {
    if(navigator.userAgent.match(/Windows Phone/i)){
      return false
    }

    return true
  }

  run() {
    const isWebGLSupported = this.checkWebGLSupport()
    if (!isWebGLSupported) return

    if (!this.isBrowserSupported()) {
      document.querySelector("#connecting_message").style.display = 'none'
      document.querySelector("#home_error_message").innerText = "Your browser is not supported"
      return
    }

    console.log("initializing..")
    console.log("revision: " + window.revision)
    window.initializeTime = (new Date()).getTime()

    this.localProfile = LocalProfile.load()

    let name = this.getUrlParam().get("name")
    if (name) {
      this.localProfile.setName(name)
    }

    this.initPools()
    this.initTranslation()
    this.initGameUI()
    this.initSessionId()
    this.mobileDetect()
    this.initListeners()
    this.initGame()
    this.initSettingsMenu()
    this.localWorldMenu = new LocalWorldMenu(this)
    this.localWorldMenu.show()
  }

  initProjectilePools() {
    let projectileKlasses = Projectiles.getList()
    projectileKlasses.forEach((klass) => {
      let projectileName = Helper.getProjectileNameById(klass.getType())
      ObjectPool.create(projectileName, klass)
    })
  }

  joinStandaloneWorld() {
    this.localWorldMenu.hideError()
    let url = this.standaloneServerUrl || this.getUrlParam().get("server") || "ws://127.0.0.1:8000"

    document.querySelector("#connecting_message").style.display = 'none'
    this.requestGame(url)
  }

  initGameUI() {
    let timeLabel = "<div id='day_label_container'>" + i18n.t('DayCount', { day: "<span id='day_label'></span>" }) + "</div>" +
                    "<div id='hour_label_container'>" + i18n.t('HourCount', { hour: "<span id='hour_label'></span>"}) + "</div>"
    time_label.innerHTML = timeLabel

    let countdownTimer = i18n.t('RestartIn', { number: "<span id='restart_countdown_number'></span>" })
    restart_countdown.innerHTML = countdownTimer
  }

  clearHomeErrorMessage() {
    document.querySelector("#home_error_message").innerText = ""
  }

  initSessionId() {
    this.sessionId = uuidv4()
  }

  mobileDetect() {
    this.isMobile = isMobile.any

    if (this.isMobile) {
      document.querySelector("body").classList.add("mobile")
    }
  }

  getBrowserHref() {
    return document.location.href
  }

  getUrlParam() {
    const url = this.getBrowserHref()
    return new URLSearchParams(url.split("?")[1])
  }

  onGameInitialized() {
    this.isGameInitialized = true

    this.initProjectilePools()
    document.querySelector("#connecting_message").style.display = 'none'

    // direct connect: ?server=ws://host:port&name=<name>
    if (this.getUrlParam().get("server")) this.joinStandaloneWorld()
  }

  requestGame(url, options = {}) {
    if (!url) return

    this.connectGame(url, () => {
      this.game.requestGame(options)
    })
  }

  connectGame(url, cb) {
    if (this.game.player) {
      SocketUtil.emit("LeaveGame", {})
    }

    if (this.gameConnection) {
      let isAlreadyConnected = this.gameConnection.url === url && this.gameConnection.isConnected()
      if (isAlreadyConnected) {
        return cb()
      }

      this.gameConnection.close()
    }

    // co-op guests build each socket URL with a fresh password proof
    this.gameConnection = new GameConnection(url, { authorize: this.standaloneAuthorize })
    this.gameConnection.init({
      success: (gameConnection) => {
        this.game.setGameConnection(this.gameConnection)

        if (cb) cb()
      },
      error: (wasNeverConnected, reason) => {
        if (wasNeverConnected) {
          this.onPlayerCantJoin({ message: reason || "Cant connect to server " + url })
        }
      }
    })
  }

  initGame() {
    window.game = this.game = new Game(this)
  }

  // served by the game server this client is connected to (the host, for a
  // co-op guest): Server#serveScreenshotThumbnail
  getScreenshotThumbnailPath(key) {
    let serverUrl = this.gameConnection ? this.gameConnection.url : ""
    return serverUrl.replace(/^ws:/, "http:").replace(/\/$/, "") + `/screenshots/${key}_thumb.jpg`
  }

  // a refused join, a kick or a lost host: back on the home menu, with the
  // reason in a banner the player can close before trying again
  onPlayerCantJoin(data) {
    document.querySelector("#connecting_message").style.display = 'none'
    console.log(data.message)
    // e.g. the client's protocol failing to load, before the menu exists
    if (!this.localWorldMenu) {
      document.getElementById("home_error_message").innerText = data.message || "Unable to join the world"
      return
    }

    this.localWorldMenu.showError(data.message || "Unable to join the world")
    if (this.localWorldMenu.el.style.display !== 'block') this.localWorldMenu.show()
  }

  initSettingsMenu() {
    this.settingsMenu = new SettingsMenu(this)
  }

  initAdditionalLibraries() {
    let libs = ["cytoscape.min.js"]
      // libs.push(["jquery-3.3.1.min.js", "d3.v357.min.js", "epoch.min.js"])
    this.installLib(libs)
  }

  installLib(libs) {
    if (libs.length === 0) return
    let lib = libs.shift()

    const script = document.createElement('script')
    script.setAttribute('src','/' + lib)
    script.onload = this.installLib.bind(this, libs)
    document.head.appendChild(script)
  }

  initListeners() {
    document.querySelector(".main_menu .settings_menu_btn").addEventListener("click", this.onSettingsMenuBtnClick.bind(this), true)
    document.querySelector(".resume_menu_btn").addEventListener("click", this.onResumeMenuBtnClick.bind(this), true)
    document.querySelector(".exit_game_menu_btn").addEventListener("click", this.onExitGameMenuBtnClick.bind(this), true)
    document.querySelector(".back_main_menu_btn").addEventListener("click", this.onBackMainMenuBtnClick.bind(this), true)
    document.querySelector("#language_select").addEventListener("change", this.onLanguageSelectChange.bind(this), true)

    // disable right click because it causes some keyup event listener not firing bug (that causes player to move indefinitely)
    document.addEventListener("contextmenu", function(e){
        e.preventDefault()
    }, false)
  }

  hideMainMenu() {
    document.querySelector(".main_menu").style.display = 'none'
  }

  showMainMenu() {
    document.querySelector(".main_menu").style.display = 'block'
    this.settingsMenu.hide()
    this.hideBackMainBtn()
  }

  hideBackMainBtn() {
    document.querySelector(".back_main_menu_btn").style.display = 'none'
  }

  showBackMainBtn() {
    document.querySelector(".back_main_menu_btn").style.display = 'block'
  }

  onBackMainMenuBtnClick() {
    window.history.replaceState(null, null, "?")

    if (document.querySelector("#welcome_container").classList.contains("in_game")) {
      this.showMainMenu()
    } else {
      this.showHomeMenu()
    }
  }

  showHomeMenu() {
    this.hideMainMenu()
    this.settingsMenu.hide()
    this.hideBackMainBtn()
    this.localWorldMenu.show()
  }

  hideHomeMenu() {
    document.querySelector(".middle_container").style.display = 'none'
  }

  hideMenus() {
    this.hideMainMenu()
    this.hideHomeMenu()
  }

  onSettingsMenuBtnClick(e) {
    this.hideMenus()

    this.showBackMainBtn()
    this.settingsMenu.show()
  }

  onResumeMenuBtnClick(e) {
    this.game.closeInGameMenu()
  }

  onExitGameMenuBtnClick(e) {
    SocketUtil.emit("LeaveGame", {})

    if (this.gameConnection) {
      this.gameConnection.close()
    }

    if (this.game.isCreatedByPlayer()) {
      setTimeout(() => {
        this.exitGame()
      }, 1000)
    } else {
      this.exitGame()
    }
  }

  exitGame() {
    this.game.stopAllBackgroundMusic()
    this.game.closeInGameMenu()
    // this.game.gameConnection.close()
    window.history.replaceState(null, null, "?")

    this.game.displayHomePage()
  }
}

window.main = new Main()
main.run()
