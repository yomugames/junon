window.debugMode = env === "development"
window.socket = null

const SocketUtil = require("./util/socket_util")
const Protocol = require("./../../common/util/protocol")
const Config = require("junon-common/config")
const Game = require("./entities/game")
const GameExplorer = require("./components/game_explorer")
const PvPExplorer = require("./components/pvp_explorer")
const SettingsMenu = require("./components/settings_menu")
const MiniGameDetailsMenu = require("./components/minigame_details_menu")
const BanManager = require("./components/ban_manager")
const GameConnection = require("./components/game_connection")
const ExceptionReporter = require("./util/exception_reporter")
const ClientHelper = require("./util/client_helper")
const isMobile = require('ismobilejs')
const Cookies = require("js-cookie")
const uuidv4 = require('uuid/v4')
const FirebaseClientHelper = require('./util/firebase_client_helper')
const Polyglot = require('node-polyglot')
const japaneseTranslationMap = require("../../common/translations/ja")
const englishTranslationMap = require("../../common/translations/en")
const russianTranslationMap = require("../../common/translations/ru")
const ObjectPool = require("../../common/entities/object_pool")
const TeamEntry = require("./components/team_entry")
const Lighting = require("./entities/lighting")
const Particles = require("./entities/particles/index")
const BitmapText = require("./util/bitmap_text")
const Projectiles = require("./entities/projectiles/index")
const Helper = require("../../common/helper")
const SpritePoolInstance = require("./entities/sprite_pool_instance")

require('url-search-params-polyfill')

require("./util/polyfills")

class Main {
  constructor() {
    this.friends = {}
    this.onlinePlayers = {}
    this.sentFriendRequests = {}
    this.receivedFriendRequests = {}
  }

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

  checkLocalStorageSupport() {
    let result = true

    try {
      window.localStorage
    } catch(e) {
      result = false
    }

    return result
  }

  hideUchu() {
    if (document.referrer.length > 0) {
      // being embeded in iframe from another site

      document.querySelector(".other_game_ad_square").style.display = 'none'
      document.querySelector(".junon_ad_square_2").classList.add("middle")
    }
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
      let savedLanguage = Cookies.get("language")
      if (savedLanguage && savedLanguage !== 'en') {
        this.navigateToLanguage(savedLanguage)
      } else {
        window.language = 'en'
      }
    }

    document.getElementById("language_select").value = window.language
    document.querySelector(".minigame_chat_language_select").value = window.language

    window.isForeignLanguage = language !== 'en'

    const url = this.getBrowserHref()
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

  getVersion() {
    let el = document.querySelector(".game_version")
    if (!el) return "0.0.0"

    let versionString = el.innerText
    return versionString.replace('.alpha','')
  }

  getRevisionUrl() {
    if (env === "staging") {
      return "https://staging.junon.io/revision"
    } else if (env === "production") {
      return "https://junon.io/revision"
    } else {
      return "/revision"
    }
  }

  isClientUpToDate(cb) {
    ClientHelper.httpRequest(this.getRevisionUrl(), {
      success: (result) => {
        if (result !== window.revision) {
          // old version
          cb(false)
        } else {
          cb(true)
        }
      },
      error: () => {
        cb(true)
      }
    })
  }

  redirectToHttps() {
    if (env === 'staging' && location.protocol !== 'https:') {
      location.replace(`https:${location.href.substring(location.protocol.length)}`);
    }
  }

  chromeWebsocketBugWorkaround() {
    // https://bugs.chromium.org/p/chromium/issues/detail?id=1108112
    // window._requestAnimationFrame = window.requestAnimationFrame;
    // window.requestAnimationFrame = function (callback) {
    //         setTimeout (function () { window._requestAnimationFrame (callback) }, 0);
    // }
  }

  isBrowserSupported() {
    if(navigator.userAgent.match(/Windows Phone/i)){
      return false
    }

    return true
  }

  navigateViaUrlParam() {
    if (this.inviteToken) {
      this.renderGameInvite()
      return
    }

    let miniGame = this.getUrlParam().get("minigame")
    if (miniGame) {
      let miniGameId = miniGame.split("-")[1]
      if (this.gameExplorer.getMiniGame(miniGameId)) {
        this.hideMenus()
        this.showBackMainBtn()

        this.miniGameDetailsMenu.open({ gameId: miniGameId })
        return
      }
    }

    let game = this.getUrlParam().get("game")
    let isImposterMode = this.isImposterMode()
    if (isImposterMode) {
      this.hideMenus()
      let miniGameId = debugMode ? "eWC1CfZymRExY" : "Ap9OYBkw3dQvJ"

      this.miniGameDetailsMenu.open({ gameId: miniGameId })
      return
    }

    if (game) {
      let miniGameId = game.split("-")[1]
      if (this.gameExplorer.getMiniGame(miniGameId)) {
        this.hideMenus()
        document.querySelector(".main_menu_navigator").style.marginTop = '10px'
        document.querySelector("#changelogs").style.display = 'none'
        // document.querySelector("#more_io_games").style.display = 'block'

        this.miniGameDetailsMenu.open({ gameId: miniGameId })
        return
      }
    }

    let nav = this.getUrlParam().get("nav")
    if (nav) {
      let tab = document.querySelector(".colony_filter_tab[data-tab='" + nav + "']")
      if (tab) {
        this.gameExplorer.selectColonyFilterTab(tab)
      }
    }

  }

  run() {
    this.redirectToHttps()
    this.chromeWebsocketBugWorkaround()

    const isWebGLSupported = this.checkWebGLSupport()
    if (!isWebGLSupported) return

    if (!this.isBrowserSupported()) {
      document.querySelector("#connecting_message").style.display = 'none'
      document.querySelector("#home_error_message").innerText = "Your browser is not supported"
      return
    }

    const hasLocalStorage = this.checkLocalStorageSupport()
    if (!hasLocalStorage) {
      document.querySelector("#login_cookies").style.display = 'block'
    }

    console.log("initializing..")
    window.initializeTime = (new Date()).getTime()

    if (env === "production" || env === "staging") {
      this.initAnalytics()
      this.initErrorReporting()
    }

    this.initPools()
    this.initTranslation()
    this.initGameUI()
    this.hideStagingMenu()
    this.logGameClientInfo()
    this.initSessionId()
    this.initGameExplorer()
    this.mobileDetect()
    this.initAuthentication()
    this.initRegionTabContent()
    this.initServerAnnouncement()
    this.renderImposterMode()
    this.hideUchu()

    this.parseInviteLink()
    this.initListeners()

    this.initFingerPrint(() => {
      this.determineRegion(() => {
        this.gameExplorer.init(() => {
          this.initGame()
          this.initMiniGameMenu()
          this.initSettingsMenu()
          this.initBanManagerMenu()

          this.updateItchChangelogUrl()
          this.updateItchPrivacyUrl()
          // this.displayHomePageAd()
          this.initVideoAd()

          this.isClientUpToDate((isUpToDate) => {
            if (!isUpToDate) {
              document.querySelector("#home_error_message").innerText = i18n.t('OutdatedGameClient')
              document.querySelector("#connecting_message").style.display = 'none'
            }
          })
        })
      })
    })
  }

  renderImposterMode() {
    if (this.isImposterMode()) {
      document.querySelector("body").classList.add("imposter_mode")
      document.querySelector("#authentication_container").style.display = 'none'
      document.querySelector("#changelogs").style.display = 'none'
      document.querySelector("#total_online_count").style.display = 'none'
      document.querySelector("#privacy_link").style.display = 'none'
      document.querySelector("#rules_link").style.display = 'none'

      if (this.getUrlParam().get("impy")) {
        this.impy = true
        document.querySelector(".minigame_poster").src = "/assets/images/background/imposter_bg_2.jpg"
      } else {
        document.querySelector(".minigame_poster").src = "/assets/images/background/imposter_bg.jpg"
      }
    }
  }

  initGameUI() {
    let timeLabel = "<div id='day_label_container'>" + i18n.t('DayCount', { day: "<span id='day_label'></span>" }) + "</div>" +
                    "<div id='hour_label_container'>" + i18n.t('HourCount', { hour: "<span id='hour_label'></span>"}) + "</div>"
    time_label.innerHTML = timeLabel

    let countdownTimer = i18n.t('RestartIn', { number: "<span id='restart_countdown_number'></span>" })
    restart_countdown.innerHTML = countdownTimer
  }

  async initServerAnnouncement() {
    let announcement = await FirebaseClientHelper.getServerAnnouncement()
    if (announcement) {
      document.querySelector("#server_announcement_message").innerText = announcement
      document.querySelector("#server_announcement_bar").style.display = 'block'
    }
  }

  hideStagingMenu() {
    if (env === 'staging') {
      document.querySelector("#region_selector").style.display = 'none'
    }
  }

  clearHomeErrorMessage() {
    document.querySelector("#home_error_message").innerText = ""
  }

  initSessionId() {
    this.sessionId = uuidv4()
  }

  initFingerPrint(cb) {
    FingerprintJS.load().then(fp => {
      fp.get().then(result => {
        const visitorId = result.visitorId
        this.fingerprint = visitorId
        cb()
      })
    })
  }

  logGameClientInfo() {
    console.log("revision: " + window.revision)
  }

  displayHomePageAd() {
    if (debugMode) return
    let threeMinutes = 1000 * 60 * 3
    let shouldRefreshAd = !this.lastHomepageAdDisplay ||
                          (this.lastHomepageAdDisplay && ((Date.now() - this.lastHomepageAdDisplay) > threeMinutes))
    if (shouldRefreshAd) {
      aiptag.cmd.display.push(() => {
        aipDisplayTag.display('junon-io_300x250');
      })

      aiptag.cmd.display.push(() => {
        aipDisplayTag.display('junon-io_300x250_2');
      })
      this.lastHomepageAdDisplay = Date.now()
    }
  }

  initVideoAd() {
    let padding = 100
    let playerWidth = window.innerWidth - padding
    let playerHeight = window.innerHeight - padding
    playerWidth = Math.min(800, playerWidth)
    playerHeight = Math.min(450, playerHeight)

    document.querySelector("#preroll_container").style.width  = playerWidth  + "px"
    document.querySelector("#preroll_container").style.height = playerHeight + "px"
    document.querySelector("#preroll_container").style.marginLeft = -(playerWidth/2) + "px"
    document.querySelector("#preroll_container").style.marginTop  = -(playerHeight/2) + "px"

    aiptag.cmd.player.push(() => {
      window.adplayer = new aipPlayer({
        AD_WIDTH: playerWidth,
        AD_HEIGHT: playerHeight,
        AD_FULLSCREEN: false,
        AD_CENTERPLAYER: false,
        LOADING_TEXT: 'loading advertisement',
        PREROLL_ELEM: () => {
          return document.getElementById('preroll')
        },
        AIP_COMPLETE: () => {
          document.querySelector("#preroll_container").style.display = 'none'
          if (this.videoAdCompleteCallback) {
            this.videoAdCompleteCallback()
          }
        },
        AIP_REMOVE: () => {
          document.querySelector("#preroll_container").style.display = 'none'
        }
      });
    });
  }

  recordColonyVisit() {
    if (!Cookies.get("colonyVisit")) {
      let day  = (new Date()).getDay()
      let time = Date.now()
      let colonyVisit = [day, time].join(":")
      Cookies.set("colonyVisit", colonyVisit)
    }
  }

  shouldShowVideoAd() {
    if (debugMode) return false

    let colonyVisit = Cookies.get("colonyVisit")
    if (!colonyVisit) return false

    let day  = parseInt(colonyVisit.split(":")[0])
    let time = parseInt(colonyVisit.split(":")[1])

    let timeNow = Date.now()
    let dateNow = new Date()

    if (day !== dateNow.getDay()) {
      Cookies.remove("colonyVisit")
      return false
    }

    let durationSinceColonyVisit = timeNow - time
    let threshold = env === 'staging' ? (1000 * 60 * 5) : (1000 * 60 * 60)
    let awayThreshold = (1000 * 60 * 60 * 3)
    if (durationSinceColonyVisit >= threshold) {
      Cookies.remove("colonyVisit")
      if (durationSinceColonyVisit >= awayThreshold) {
        return false
      } else {
        return true
      }
    }

    return false
  }

  displayVideoAd() {
    if (typeof adplayer !== 'undefined') {
      aiptag.cmd.player.push(() => {
        document.querySelector("#preroll_container").style.display = 'block'
        adplayer.startPreRoll()
      })
    } else {
      //Adlib didnt load this could be due to an adblocker, timeout etc.
      if (this.videoAdCompleteCallback) {
        this.videoAdCompleteCallback()
      }
    }
  }

  initRegionTabContent() {
    if (debugMode) {
      this.regions = [
        { id: 'localhost', name: "localhost"},
        { id: 'test', name: "test"}
      ]
    } else {
      this.regions = [
        { id: 'nyc1', name: "USA" },
        { id: 'fra1', name: "Europe"}
      ]
    }

    let selectOptions = ""

    let tabPanes = ""
    this.regions.forEach((region) => {
        selectOptions += "<option value='" + region.id + "'>" + region.name + "</option>"
    })

    tabPanes += "<div class='tab-pane'>" +
        "<div class='game_browser_container'>" +
            "<div class='search_colony_list colony_list' cellspacing='0' cellpadding='0'>" +
            "</div>" +
            "<div class='main_colony_list colony_list' cellspacing='0' cellpadding='0'>" +
            "</div>" +
        "</div>" +
    "</div>"

    document.querySelector("#region_select").innerHTML = selectOptions
    document.querySelector("#region_tab_content").innerHTML = tabPanes
  }

  mobileDetect() {
    this.isMobile = isMobile.any

    if (this.isMobile) {
      document.querySelector("body").classList.add("mobile")
    }
  }

  updateItchChangelogUrl() {
    if (this.isItchPage()) {
      let changelogUrl = window.location.href.replace("index.html", "changelogs.html")
      document.getElementById("changelog_link").href = changelogUrl
    }
  }

  updateItchPrivacyUrl() {
    if (this.isItchPage()) {
      let privacyUrl = window.location.href.replace("index.html", "privacy.html")
      document.getElementById("privacy_link").href = privacyUrl
    }
  }

  isItchPage() {
    return window.location.href.match("hwcdn.net")
  }

  isLoggedIn() {
    let hasLocalStorage = this.checkLocalStorageSupport()
    if (!hasLocalStorage) {
      return false
    }

    return FirebaseClientHelper.isLoggedIn()
  }

  async bootSector(sectorId) {
    let data = {
      sectorId: sectorId,
      env: this.getEnvToSendToMatchmaker(),
      region: this.region,
      sessionId: this.sessionId
    }

    if (this.isLoggedIn()) {
      let idToken = await this.getFirebaseIdToken()
      data["idToken"] = idToken
      data["username"] = this.userData.username
      data["uid"] = this.uid
    }

    if (this.getTargetHost()) {
      data["targetHost"] = this.getTargetHost()
    }

    if (this.isStress()) {
      data["stress"] = true
    }

    this.sendToMatchmaker({ event: "BootSector", data: data })
  }

  getBrowserHost() {
    return window.location.origin
  }

  getBrowserHref() {
    return document.location.href
  }

  getUrlParam() {
    const url = this.getBrowserHref()
    return new URLSearchParams(url.split("?")[1])
  }

  parseInviteLink() {
    const inviteParam = this.getUrlParam().get("e")
    if (inviteParam) {
      this.inviteToken = inviteParam
    }
  }

  getTargetHost() {
    const targetParam = this.getUrlParam().get("target")
    if (targetParam) {
      return targetParam
    }
  }

  renderGameInvite() {
    if (!this.inviteToken) return

    this.gameExplorer.fetchSectorData(this.inviteToken, (sector) => {
      if (sector) {
        let teamEntry = new TeamEntry(this.gameExplorer, sector)
        this.gameExplorer.selectGameEntry(teamEntry)
        this.showGameInviteMenu(teamEntry)

        this.teamInviteEntryFound = true
        this.hideHomeMenu()
      }
    })
  }

  showGameInviteMenu(teamEntry) {
    this.showBackMainBtn()

    let container = document.querySelector(".game_invite_container")
    if (teamEntry.getScreenshot()) {
      let src = this.getScreenshotThumbnailPath(teamEntry.getScreenshot())
      container.querySelector(".game_invite_screenshot").src = src
    }

    let miniGameMatch = teamEntry.data.sectorId.match(/mini-(.*)-/)
    if (miniGameMatch) {
      let gameId = miniGameMatch[1]
      let miniGameData = this.gameExplorer.miniGames[gameId]
      if (miniGameData) {
        container.querySelector(".game_invite_name").innerText = miniGameData.name
        container.querySelector(".game_invite_container .game_invite_day_count").style.display = 'none'
      }
    } else {
      container.querySelector(".game_invite_name").innerText = teamEntry.getName()
      container.querySelector(".game_invite_container .team_days_alive").innerText = teamEntry.getDayCount()
      container.querySelector(".game_invite_container .game_invite_day_count").style.display = 'block'
    }

    container.querySelector(".game_invite_container .team_member_count").innerText = teamEntry.getMemberCount() + " / 10"

    container.style.display = 'block'
  }

  hideGameInviteMenu() {
    document.querySelector(".game_invite_container").style.display = 'none'
  }

  onGameInitialized() {
    this.isGameInitialized = true
    this.postInitSetup()
  }

  onRegionAssigned() {
    this.isRegionSelected = true
  }

  getRegionName() {
    if (!this.region) return ""

    let regionData = this.regions.find((regionData) => {
      return regionData.id === this.region
    })

    return regionData.name
  }

  getObjectPool() {
    return ObjectPool
  }

  preallocateObjectPools() {
    let sprites = []
    for (var i = 0; i < 5000; i++) {
      sprites.push(SpritePoolInstance.create({texture: null}))
    }

    sprites.forEach((sprite) => {
      sprite.remove()
    })
  }

  postInitSetup() {
    if (this.initSetupFinished) return

    // two conditions need to be met:
    // game initialized + matchmaker returned sector/team list
    if (!this.isSectorListPopulated) return
    if (!this.isGameInitialized) return

    let projectileKlasses = Projectiles.getList()
    projectileKlasses.forEach((klass) => {
      let projectileName = Helper.getProjectileNameById(klass.getType())
      ObjectPool.create(projectileName, klass)
    })


    this.navigateViaUrlParam()

    // this.preallocateObjectPools()

    document.querySelector("#connecting_message").style.display = 'none'

    this.initSetupFinished = true

    if (!this.teamInviteEntryFound &&
        !this.getUrlParam().get("nav") &&
        !this.getUrlParam().get("game") &&
        !this.getUrlParam().get("minigame")) {
      this.showHomeMenu()
    }

  }

  isImposterMode() {
    return this.getUrlParam().get("game") &&
           (this.getUrlParam().get("game") === 'FindtheImposter-Ap9OYBkw3dQvJ' ||
            this.getUrlParam().get("game") === 'FindtheImposter-eWC1CfZymRExY' )
  }

  getSubdomain() {
    return window.location.host.split('.')[0]
  }

  requestGame(url, options = {}) {
    if (!url) return

    this.connectGame(url, () => {
      this.game.requestGame(options)
    })
  }

  enableJoin() {
    this.isJoinInProgress = false
    this.newColonySectorId = null
    this.resetButtonStates()
  }

  resetButtonStates() {
    document.getElementById("play_btn").querySelector("span").innerText = i18n.t("Play")
    document.querySelector(".play_spinner").style.display = 'none'

    document.querySelector(".new_colony_menu_btn span").innerText = i18n.t("New Colony")
    document.querySelector(".new_colony_menu_btn .play_spinner").style.display = 'none'

    document.querySelector(".tutorial_menu_btn span").innerText = i18n.t("Tutorial")
    document.querySelector(".tutorial_menu_btn .play_spinner").style.display = 'none'

    document.querySelector(".continue_game_btn span").innerText = i18n.t("Start Game")
    document.querySelector(".continue_game_btn .play_spinner").style.display = 'none'
  }

  hideChangeLog() {
    document.querySelector("#changelogs").style.display = 'none'
  }

  connectGame(url, cb) {
    if (this.gameExplorer.isInGame()) {
      SocketUtil.emit("LeaveGame", {})
    }

    if (url === 'wss://') return

    if (this.gameConnection) {
      let isAlreadyConnected = this.gameConnection.url === url && this.gameConnection.isConnected()
      if (isAlreadyConnected) {
        return cb()
      }

      this.gameConnection.close()
    }

    this.gameConnection = new GameConnection(url)
    this.gameConnection.init({
      success: (gameConnection) => {
        this.game.setGameConnection(this.gameConnection)

        if (cb) cb()
      },
      error: (wasNeverConnected) => {
        if (wasNeverConnected) {
          this.onPlayerCantJoin({ message: "Cant connect to server " + url })
        } else {
          this.enableJoin()
        }
      }
    })
  }

  initGame() {
    window.game = this.game = new Game(this)

    if (!Cookies.get("list_mode") || Cookies.get("list_mode") === 'false') {
      // default
    } else if (Cookies.get("list_mode") === 'true') {
      document.querySelector(".main_colony_list").classList.add("list_mode")
      document.querySelector(".search_colony_list").classList.add("list_mode")
    }
  }

  getScreenshotThumbnailPath(key) {
    if (debugMode) {
      return `http://localhost:8001/assets/screenshots/${key}_thumb.jpg`
    } else {
      return `https://junon.nyc3.cdn.digitaloceanspaces.com/screenshots/${key}_thumb.jpg`
    }
  }

  onPlayerCantJoin(data) {
    document.querySelector("#connecting_message").style.display = 'none'
    document.querySelector(".loading_modal").style.display = 'none'
    console.log(data.message)

    setTimeout(() => {
      this.enableJoin()
      let message = data.message || "Servers are currently full"
      document.getElementById("home_error_message").innerText = message

      if (this.isMobile) {
        setTimeout(() => {
          this.clearHomeErrorMessage()
        }, 2000)
      }
    }, 1000)
  }

  getExceptionReporter() {
    return ExceptionReporter
  }

  initGameExplorer() {
    this.gameExplorer = new GameExplorer(this)
    this.pvpExplorer = new PvPExplorer(this)
  }

  initSettingsMenu() {
    this.settingsMenu = new SettingsMenu(this)
  }

  initMiniGameMenu() {
    this.miniGameDetailsMenu = new MiniGameDetailsMenu(this)
  }

  initBanManagerMenu() {
    this.banManager = new BanManager(this)
  }

  getCookieInstance() {
    return Cookies
  }

  getMatchmakerServersUrl() {
    let baseUrl = Config[env].matchmakerUrl + "servers"

    let envToSend = this.getEnvToSendToMatchmaker()
    let url = baseUrl + "?environment=" + envToSend
    return url
  }

  getEnvToSendToMatchmaker() {
    return window.test_vm ? 'vm' : env
  }

  renderRegionSelectPlayerCount(onlineCountByRegion) {
    if (this.isMobile) return

    for (let regionName in onlineCountByRegion) {
      let option = document.querySelector("#region_select option[value='" + regionName + "']")
      let onlineCount = onlineCountByRegion[regionName]

      let region = this.regions.find((regionData) => { return regionData.id === regionName })
      if (region) {
        let friendlyRegionName = region.name
        option.innerText = `${friendlyRegionName} - ${onlineCount} players`
      }
    }
  }

  determineRegion(cb) {
    let matchmakerServersUrl = this.getMatchmakerServersUrl()

    ClientHelper.httpRequest(matchmakerServersUrl, {
      success: (result) => {
        let data = JSON.parse(result)
        if (data.error) {
          this.onPlayerCantJoin({ message: data.error })
          return
        }

        this.renderRegionSelectPlayerCount(data.onlineCountByRegion)
        document.querySelector("#total_online_count").innerText = data.totalOnlineCount + " " + i18n.t("PlayersOnline")
        this.serversByRegion = data.serversByRegion
        this.gameExplorer.setMiniGames(data.miniGames)

        this.findBestRegion(this.serversByRegion, (region) => {
          if (!region) {
            region = this.regions[0].id // choose a default one
          }

          this.setRegion(region)
          this.onRegionAssigned()
          cb()
        })
      },
      error: () => {
        this.onPlayerCantJoin({ message: i18n.t("MatchmakerUnavailable") })
      }
    })
  }

  onSectorEntryAdded(sectorEntry) {
    if (this.gameExplorer) {
      this.gameExplorer.onSectorEntryAdded(sectorEntry)
    }
  }

  connectNewColonyGame(host, sectorId) {
    let url  = this.getServerWebsocketUrl(host)
    this.requestGame(url, { sectorId: sectorId })
  }

  onSectorEntryRemoved(sectorEntry) {
  }

  setRegion(region) {
    this.region = region
    document.querySelector('#region_select').value = region
  }

  findBestRegion(serversByRegion, cb) {
    let pings = {}
    let requests = []
    let counter = Object.keys(serversByRegion).length

    for (let region in serversByRegion) {
      let servers = serversByRegion[region]
      let serverIp = Object.keys(servers)[0]
      if (serverIp) {
        let url = this.getServerHTTPUrl(serverIp)
        pings[region] = Date.now()

        let request = ClientHelper.httpRequest(url + "/ping", {
          success: (result) => {
            pings[region] = Date.now() - pings[region]

            counter -= 1
            let isAllServerPinged = counter === 0
            if (isAllServerPinged) {
              // check lowest ping server
              this.isBestRegionFound = true
              let bestRegion = this.getLowestPingRegion(pings)
              console.log("all pings finished. best region - " + bestRegion)
              cb(bestRegion)
            }
          },
          error: () => {
          }
        })

        requests.push(request)
      }
    }

    // 1 second limit
    setTimeout(() => {
      if (!this.isBestRegionFound) {
        console.log("1 second reached. aborting pings..")
        requests.forEach((xhttp) => {
          let done = 4
          if (xhttp.readyState !== done) {
            xhttp.abort()
          }
        })

        let bestRegion = this.getLowestPingRegion(pings)
        bestRegion = bestRegion || Object.keys(pings)[0]
        console.log("best region - " + bestRegion)
        cb(bestRegion)
      }
    }, 1000)
  }

  getLowestPingRegion(pings) {
    let lowest = 10000
    let targetRegion

    for (let region in pings) {
      let ping = pings[region]
      console.log("ping: " + region + " - " + ping + " ms")
      if (ping < lowest) {
        targetRegion = region
        lowest = ping
      }
    }

    return targetRegion
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

  initErrorReporting() {
    ExceptionReporter.init()
  }

  initAnalytics() {
    // google analytics
    const trackingId = Config[env].googleAnalyticsId

    document.write('<script async src="https://www.googletagmanager.com/gtag/js?id=' + trackingId + '"></script>')
    window.dataLayer = window.dataLayer || []
    function gtag(){dataLayer.push(arguments)}
    window.gtag = gtag
    gtag('js', new Date())
    gtag('config', trackingId)
  }

  onNameInputKeyup(e) {
    // if (e.which === 13) { // enter
    //   this.onPlayBtnClick()
    // }
  }

  onPlayBtnClick() {

    // if (this.isJoinInProgress) return
    // this.lockJoin()

    // document.getElementById("play_btn").querySelector("span").innerText = ""
    // document.querySelector("#play_btn .play_spinner").style.display = 'inline-block'
    // this.clearHomeErrorMessage()

    // this.gameExplorer.joinRandomSectorEntry()
  }

  onLoginBtnClick(e) {
    const socialLoginContainer = document.querySelector("#social_login_container")
    if (socialLoginContainer.style.display === 'block') {
      socialLoginContainer.style.display = 'none'
    } else {
      socialLoginContainer.style.display = 'block'
    }

    if (e.target.classList.contains("mobile_login_btn")) {
      // position right below mobile_login_btn
      let margin = 10
      let positionY = e.target.offsetTop + e.target.offsetHeight + margin
      socialLoginContainer.style.top = positionY + "px"
    }
  }

  onLogoutBtnClick() {
    this.user = null
    this.uid = null

    FirebaseClientHelper.signOut(() => {
      this.showAuthContainer()
      this.hideUsernameContainer()
    })

    document.getElementById("logout_btn").style.display = 'none'
    document.getElementById("firebaseui-auth-container").style.display = 'none'
    this.onBackMainMenuBtnClick()

    document.querySelector(".mobile_username_container").classList.remove("logged_in")
    document.querySelector(".mobile_login_btn").style.display = 'block'
    document.querySelector(".mobile_logout_btn").style.display = 'none'

    document.querySelector("#social_login_container").style.display = 'none'
    document.querySelector("#username_form_container").style.display = 'none'
  }

  onSectorListPopulated() {
    this.isSectorListPopulated = true
    this.postInitSetup()
  }

  async isUsernameBadWord(username) {
    let matchmakerUrl = Config[env].matchmakerUrl

    return new Promise((resolve, reject) => {
      ClientHelper.httpRequest(matchmakerUrl + `checkname?username=${username}`, {
        success: (result) => {
          if (result === "invalid") {
            resolve(true)
          } else {
            resolve(false)
          }
        },
        error: (e) => {
          reject(e)
        }
      })
    })
  }

  onSearchWorldInputKeyup(e) {
    let keyCode = ClientHelper.getKeycode(e)
    if (keyCode === 13) { // enter
      this.onSearchWorldBtnClick()
    }
  }

  onUsernameInputKeyup(e) {
    let keyCode = ClientHelper.getKeycode(e)
    if (keyCode === 13) { // enter
      this.onSetUsernameBtnClick()
    }
  }

  onNewColonyNameInputKeyup(e) {
    let keyCode = ClientHelper.getKeycode(e)
    if (keyCode === 13) { // enter
      this.onNewColonyMenuBtnClick()
    }
  }

  isValidUsername(username) {
    return !username.match(/[^a-zA-Z0-9_]/)
  }

  onSearchWorldBtnClick() {
    let search = document.querySelector(".search_world_input").value
    if (search.length === 0) {
      document.querySelector(".search_colony_list").style.display = 'none'
      document.querySelector(".main_colony_list").style.display = 'block'
      return
    }

    if (this.searchLock) return
    this.searchLock = true

    let matchmakerUrl = Config[env].matchmakerUrl
    ClientHelper.httpRequest(matchmakerUrl + "search?q=" + search, {
      success: (result) => {
        try {
          this.gameExplorer.resetSearch()
          let sectors = JSON.parse(result)
          for (var i = 0; i < sectors.length; i++) {
            let colonyData = sectors[i]
            this.gameExplorer.renderSearchColony(colonyData)
          }

          let selectedFilterTab = document.querySelector(".colony_filter_tab.selected")
          if (selectedFilterTab.classList.contains("mine_colonies_tab")) {
            document.querySelector(".search_colony_list").style.display = 'none'
            document.querySelector(".main_colony_list").style.display = 'block'
          } else {
            document.querySelector(".search_colony_list").style.display = 'block'
            document.querySelector(".main_colony_list").style.display = 'none'
          }
          this.searchLock = false
        } catch(e) {
          console.log("search parse error")
          this.searchLock = false
        }
      },
      error: () => {
        console.log("search error")
        this.searchLock = false
      }
    })
  }

  async onSetUsernameBtnClick() {
    let username = document.getElementById("username_input").value
    if (username.length === 0) {
      document.getElementById("username_errors").innerText = "Username cant be blank"
      return
    } else if (username.length > 16) {
      document.getElementById("username_errors").innerText = "Username cant be longer than 16 characters"
      return
    }

    if (this.isUsernameSetInProgress) return
    this.isUsernameSetInProgress = true
    let uid = this.uid

    try {
      let isBadWord = await this.isUsernameBadWord(username)
      if (isBadWord) {
        this.isUsernameSetInProgress = false
        document.getElementById("username_errors").innerText = "Username not appropriate"
        return
      }
    } catch(e) {
      this.isUsernameSetInProgress = false
      document.getElementById("username_errors").innerText = "Service unavailable. Unable to create username"
      return
    }

    if (!uid) {
      this.isUsernameSetInProgress = false
      document.getElementById("username_errors").innerText = "Must log in to create username"
      return
    }

    let idToken = await this.getFirebaseIdToken()
    let matchmakerUrl = Config[env].matchmakerUrl
    let data = {
      idToken: idToken,
      uid: uid,
      username: username,
      email: this.user.email
    }

    ClientHelper.httpPost(matchmakerUrl + "create_user", data, {
      success: (result) => {
        this.isUsernameSetInProgress = false
        try {
          let data = JSON.parse(result)
          if (data.error) {
            document.getElementById("username_errors").innerText = data.error
          } else {
            // success
            this.renderLoggedInUser(username)
            this.hideUsernameInputForm()
          }
        } catch(e) {
          document.getElementById("username_errors").innerText = "Unable to create user"
        }
      },
      error: () => {
        this.isUsernameSetInProgress = false
        document.getElementById("username_errors").innerText = "Unable to create user"
      }
    })
  }

  onFriendRequestSent(request) {
    this.sentFriendRequests[request.friendUid] = request
    this.game.friendsMenu.onFriendRequestSent(request)
  }

  onFriendRequestReceived(request) {
    this.receivedFriendRequests[request.userUid] = request
    this.game.onFriendRequestReceived(request)
  }

  onFriendAccepted(request) {
    this.friends[request.friendUid] = request
    let name = request.receiver.username
    this.game.displayError("You are now friends with " + name, { success: true })
  }

  onRemoveFriendSuccessful(data) {
    delete this.friends[data.friendUid]
    this.game.friendsMenu.onRemoveFriendSuccessful()
  }

  onOnlineList(data) {
    if (!data.online) return

    data.online.forEach((uid) => {
      this.onlinePlayers[uid] = true
    })
  }

  async removeFriend(friendUid) {
    if (this.isFriendRequestInProgress) return
    this.isFriendRequestInProgress = true

    let idToken = await this.getFirebaseIdToken()
    let matchmakerUrl = Config[env].matchmakerUrl
    let data = { idToken: idToken, friendUid: friendUid, uid: this.uid }

    ClientHelper.httpPost(matchmakerUrl + "unfriend", data, {
      success: (result) => {
        this.isFriendRequestInProgress = false

        try {
          let data = JSON.parse(result)
          if (data.error) {
            this.game.displayError(data.error, { warning: true })
          } else {
            // success
            this.onRemoveFriendSuccessful(data)
          }
        } catch(e) {
          ExceptionReporter.captureException(e)
          this.game.displayError("Remove friend failed", { warning: true })
        }
      },
      error: () => {
        this.isFriendRequestInProgress = false
        this.game.displayError("Remove friend failed", { warning: true })
      }
    })

  }

  async addFriend(friendUid) {
    if (this.isFriendRequestInProgress) return
    this.isFriendRequestInProgress = true

    this.sentFriendRequests[friendUid] = true

    let idToken = await this.getFirebaseIdToken()
    let matchmakerUrl = Config[env].matchmakerUrl
    let data = { idToken: idToken, friendUid: friendUid, uid: this.uid }

    ClientHelper.httpPost(matchmakerUrl + "friend_request", data, {
      success: (result) => {
        this.isFriendRequestInProgress = false

        try {
          let data = JSON.parse(result)
          if (data.error) {
            this.game.displayError(data.error, { warning: true })
          } else {
            // success
            this.onFriendRequestSent(data)
          }
        } catch(e) {
          ExceptionReporter.captureException(e)
          this.game.displayError("Friend request failed", { warning: true })
        }
      },
      error: () => {
        this.isFriendRequestInProgress = false
        this.game.displayError("Friend request failed", { warning: true })
      }
    })
  }

  getPendingReceivedFriendRequestsCount() {
    let count = 0

    for (let uid in this.receivedFriendRequests) {
      let request = this.receivedFriendRequests[uid]
      if (request.status !== 'ignored') {
        count += 1
      }
    }

    return count
  }

  onFriendRequestAccepted(requestId) {
    for (let uid in this.receivedFriendRequests) {
      let request = this.receivedFriendRequests[uid]
      if (request.id === requestId) {
        delete this.receivedFriendRequests[uid]
        this.friends[request.userUid] = request
        break
      }
    }

    this.game.friendsMenu.onFriendRequestAccepted(requestId)
    this.game.friendRequestMenu.onFriendRequestAccepted(requestId)
  }

  onFriendRequestIgnored(requestId) {
    for (let uid in this.receivedFriendRequests) {
      let request = this.receivedFriendRequests[uid]
      if (request.id === requestId) {
        delete this.receivedFriendRequests[uid]
        break
      }
    }

    this.game.friendsMenu.onFriendRequestIgnored(requestId)
    this.game.friendRequestMenu.onFriendRequestIgnored(requestId)
  }

  async acceptFriendRequest(requestId) {
    if (this.isFriendRequestInProgress) return
    this.isFriendRequestInProgress = true

    let idToken = await this.getFirebaseIdToken()
    let matchmakerUrl = Config[env].matchmakerUrl
    let data = { idToken: idToken, requestId: requestId, uid: this.uid }

    ClientHelper.httpPost(matchmakerUrl + "accept_friend_request", data, {
      success: (result) => {
        this.isFriendRequestInProgress = false

        try {
          let data = JSON.parse(result)
          if (data.error) {
            this.game.displayError(data.error, { warning: true })
          } else {
            // success
            this.onFriendRequestAccepted(data.requestId)
          }
        } catch(e) {
          ExceptionReporter.captureException(e)
          this.game.displayError("Accepting Friend request failed", { warning: true })
        }
      },
      error: () => {
        this.isFriendRequestInProgress = false
        this.game.displayError("Accepting Friend request failed", { warning: true })
      }
    })
  }

  async ignoreFriendRequest(requestId) {
    if (this.isFriendRequestInProgress) return
    this.isFriendRequestInProgress = true

    let idToken = await this.getFirebaseIdToken()
    let matchmakerUrl = Config[env].matchmakerUrl
    let data = { idToken: idToken, requestId: requestId, uid: this.uid }

    ClientHelper.httpPost(matchmakerUrl + "ignore_friend_request", data, {
      success: (result) => {
        this.isFriendRequestInProgress = false

        try {
          let data = JSON.parse(result)
          if (data.error) {
            this.game.displayError(data.error, { warning: true })
          } else {
            // success
            this.onFriendRequestIgnored(data.requestId)
          }
        } catch(e) {
          ExceptionReporter.captureException(e)
          this.game.displayError("Ignore Friend request failed", { warning: true })
        }
      },
      error: () => {
        this.isFriendRequestInProgress = false
        this.game.displayError("Ignore Friend request failed", { warning: true })
      }
    })
  }

  hideMainPlayButtons() {
    document.querySelector("#play_btn").style.display = 'none'
  }

  getServerHTTPUrl(ip) {
    let protocol = this.isHttps() ? "https://" : "http://"

    return protocol + ip
  }

  getServerWebsocketUrl(ip) {
    let protocol = this.isHttps() ? "wss://" : "ws://"

    if (!ip) return null

    return protocol + ip
  }

  isHttps() {
    if (window.test_vm) return true
    if (env === "staging" || env === "production") return true
    return window.location.protocol === "https:"
  }

  initListeners() {
    document.getElementById("username_input").addEventListener("keyup", this.onUsernameInputKeyup.bind(this), true)
    document.querySelector(".search_world_btn").addEventListener("click", this.onSearchWorldBtnClick.bind(this), true)
    document.querySelector(".search_world_input").addEventListener("keyup", this.onSearchWorldInputKeyup.bind(this), true)
    document.getElementById("set_username_btn").addEventListener("click", this.onSetUsernameBtnClick.bind(this), true)
    document.getElementById("login_btn").addEventListener("click", this.onLoginBtnClick.bind(this), true)
    document.querySelector(".mobile_login_btn").addEventListener("click", this.onLoginBtnClick.bind(this), true)
    document.getElementById("logout_btn").addEventListener("click", this.onLogoutBtnClick.bind(this), true)
    document.querySelector(".mobile_logout_btn").addEventListener("click", this.onLogoutBtnClick.bind(this), true)
    document.querySelector(".new_colony_name_input").addEventListener("keyup", this.onNewColonyNameInputKeyup.bind(this), true)
    document.querySelector(".new_colony_menu_btn").addEventListener("click", this.onNewColonyMenuBtnClick.bind(this), true)
    document.querySelector(".tutorial_menu_btn").addEventListener("click", this.onTutorialMenuBtnClick.bind(this), true)
    document.querySelector(".default_play_btn").addEventListener("click", this.onDefaultPlayBtnClick.bind(this), true)
    document.querySelector(".tower_defense_game_mode_entry").addEventListener("click", this.onTowerDefenseGameModeClick.bind(this), true)
    document.querySelector(".bed_wars_game_mode_entry").addEventListener("click", this.onBedWarsGameModeClick.bind(this), true)
    document.querySelector(".domination_game_mode_entry").addEventListener("click", this.onDominationGameModeClick.bind(this), true)
    document.querySelector(".home_user_action_container .settings_menu_btn").addEventListener("click", this.onSettingsMenuBtnClick.bind(this), true)
    document.querySelector(".main_menu .settings_menu_btn").addEventListener("click", this.onSettingsMenuBtnClick.bind(this), true)
    document.querySelector(".resume_menu_btn").addEventListener("click", this.onResumeMenuBtnClick.bind(this), true)
    document.querySelector(".exit_game_menu_btn").addEventListener("click", this.onExitGameMenuBtnClick.bind(this), true)
    document.querySelector(".back_main_menu_btn").addEventListener("click", this.onBackMainMenuBtnClick.bind(this), true)
    document.querySelector(".continue_game_btn").addEventListener("click", this.onContinueGameBtnClick.bind(this), true)
    document.querySelector(".visibility_select").addEventListener("change", this.onGameVisibilitySelectChange.bind(this), true)
    document.querySelector("#language_select").addEventListener("change", this.onLanguageSelectChange.bind(this), true)
    document.querySelector(".rules_accept_btn").addEventListener("click", this.onRulesAcceptBtnClick.bind(this), true)
    document.querySelector(".imposter_game_mode_entry").addEventListener("click", this.onImposterGameModeClick.bind(this), true)
    document.querySelector(".invite_link_copy_btn").addEventListener("click", this.onCopyInviteLinkBtnCLick.bind(this), true)
    document.querySelector(".open_ban_list_btn").addEventListener("click", this.onOpenBanListClick.bind(this), true)

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
    this.hideNewGameMenu()
    this.hideGameInviteMenu()
    this.miniGameDetailsMenu.hide()
    this.hideLoadGameSettings()
  }

  hideBackMainBtn() {
    document.querySelector(".back_main_menu_btn").style.display = 'none'
  }

  showBackMainBtn() {
    document.querySelector(".back_main_menu_btn").style.display = 'block'
  }

  onBackMainMenuBtnClick() {
    window.history.replaceState(null, null, "?")

    if (this.lastMenu) {
      this.lastMenu.show()
      this.lastMenu = null
      this.hideLoadGameSettings()
    } else {
      if (document.querySelector("#welcome_container").classList.contains("in_game")) {
        this.showMainMenu()
      } else {
        this.showHomeMenu()
      }
    }
  }

  onContinueGameBtnClick() {
    document.querySelector(".continue_game_btn span").innerText = i18n.t("Starting")
      // document.querySelector(".continue_game_btn .play_spinner").style.display = 'inline-block'
    this.gameExplorer.onJoinGameBtnClick()
  }

  onOpenBanListClick() {
    this.banManager.open()
  }

  onCopyInviteLinkBtnCLick() {
    let input = document.querySelector(".invite_link_input")

    input.select()
    input.setSelectionRange(0, 99999) /*For mobile devices*/

    /* Copy the text inside the text field */
    document.execCommand("copy")
  }

  onImposterGameModeClick() {
    let id
    if (env === 'development') {
      id = "eWC1CfZymRExY"
    } else if (env === 'production' || env === 'staging') {
      id = "Ap9OYBkw3dQvJ"
    }

    this.hideMenus()
    this.showBackMainBtn()

    this.miniGameDetailsMenu.open({ gameId: id })
  }

  onTowerDefenseGameModeClick() {
    let id
    if (env === 'development') {
      id = "vbj91eofmFCiu"
    } else {
      id = 'YcdqgbswlAqRi'
    }

    this.hideMenus()
    this.showBackMainBtn()

    this.miniGameDetailsMenu.open({ gameId: id })
  }

  onBedWarsGameModeClick() {
    let id
    if (env === 'development') {
      id = "l8v7ezWMvnGeC"
    } else if (env === 'production' || env === 'staging') {
      id = "uLHpXWb2koXYe"
    }

    this.hideMenus()
    this.showBackMainBtn()

    this.miniGameDetailsMenu.open({ gameId: id })
  }

  onDominationGameModeClick() {
    let id
    if (env === 'development') {
      id = "BPF0uFha5QLUr"
    } else if (env === 'production' || env === 'staging') {
      id = "PnGkJd5xZsb0v"
    }

    this.hideMenus()
    this.showBackMainBtn()

    this.miniGameDetailsMenu.open({ gameId: id })
  }

  onRulesAcceptBtnClick() {
    document.querySelector("#rules_menu").style.display = 'none'
    SocketUtil.emit("ClientChat", { message: "/accept_rules" })
  }

  onGameVisibilitySelectChange(e) {
  }

  onLanguageSelectChange(e) {
    let selectedLanguage = e.target.value
    if (selectedLanguage !== window.language) {
      Cookies.set("language", selectedLanguage)
      this.navigateToLanguage(selectedLanguage)
    }
  }

  navigateToLanguage(language) {
    window.location.href = "/" + language + "/" + window.location.search
  }

  showLoadGameSettings(teamEntry) {
    this.hideHomeMenu()
    this.showBackMainBtn()
    document.querySelector(".load_game_settings_container").style.display = 'block'
    document.querySelector('.visibility_select').value = teamEntry.isPrivate ? 'private' : 'public'

    document.querySelector('.load_game_save_name').innerText = teamEntry.getName()
  }

  hideLoadGameSettings() {
    document.querySelector(".load_game_settings_container").style.display = 'none'
  }

  showHomeMenu() {
    this.clearHomeErrorMessage()

    document.body.style.overflowY = 'scroll'
    document.querySelector(".left_sidebar_contents").style.display = 'block'
    document.querySelector("#error_menu_content").innerText = ""
    document.querySelector("#home_background").classList.remove('security_camera')
    document.querySelector(".other_game_ad_square").style.display = 'block'

    this.gameExplorer.show()

    if (this.settingsMenu) {
      this.settingsMenu.hide()
      this.miniGameDetailsMenu.hide()
    }

    this.hideBackMainBtn()
    this.hideLoadGameSettings()
    this.hideGameInviteMenu()
    this.hideNewGameMenu()

    document.querySelector(".middle_container").style.display = 'block'
    if (this.gameExplorer && this.gameExplorer.isAttachedToBody) {
      this.gameExplorer.attachToMiddleContainer()
    }
  }

  hideHomeMenu() {
    document.querySelector(".middle_container").style.display = 'none'
  }

  lockJoin() {
    this.isJoinInProgress = true
    setTimeout(() => {
      this.isJoinInProgress = false
    }, 10000)
  }

  onNewColonyLaunchBtnClick() {
    this.hideMenus()

    this.showBackMainBtn()
    document.querySelector(".new_game_container").style.display = 'block'
  }

  hideNewGameMenu() {
    document.querySelector(".new_game_container").style.display = 'none'
  }

  async onNewColonyMenuBtnClick(e) {
    if (this.isJoinInProgress) return
    if (!this.isMatchmakerReady()) {
      this.onPlayerCantJoin({ message: i18n.t("MatchmakerUnavailable") })
      return
    }

    if (!Cookies.get('tutorial_done')) {
      this.game.confirmMenu.open({
        message: i18n.t('AskTutorialMessage'),
        proceedCallback: this.onTutorialMenuBtnClick.bind(this),
        cancelCallback: this.createNewColony.bind(this)
      })
      return
    } else {
      this.createNewColony()
    }
  }

  createNewColony() {
    this.lockJoin()
    this.clearHomeErrorMessage()

    Cookies.set('tutorial_done', true)

    document.querySelector(".new_colony_menu_btn span").innerText = i18n.t("Starting")
    document.querySelector(".new_colony_menu_btn .play_spinner").style.display = 'inline-block'

    this.requestNewColonyFromMatchmaker()
  }

  onDefaultPlayBtnClick(e) {
    this.onNewColonyLaunchBtnClick()
  }

  hasZeroGames() {
    return Object.keys(this.gameExplorer.sectorEntries).length === 0
  }

  joinDominationMiniGame() {
    if (debugMode) {
      this.gameExplorer.joinMiniGame("BPF0uFha5QLUr")
    } else {
      this.gameExplorer.joinMiniGame("PnGkJd5xZsb0v")
    }
  }

  async onTutorialMenuBtnClick(e) {
    if (this.isJoinInProgress) return
    if (!this.isMatchmakerReady()) {
      this.onPlayerCantJoin({ message: i18n.t("MatchmakerUnavailable") })
      return
    }

    this.lockJoin()
    this.clearHomeErrorMessage()

    Cookies.set('tutorial_done', true)

    document.querySelector(".tutorial_menu_btn span").innerText = i18n.t("Starting")
    document.querySelector(".tutorial_menu_btn .play_spinner").style.display = 'inline-block'

    let isTutorial = true
    this.requestNewColonyFromMatchmaker(isTutorial)
  }

  async onPlayerCreateSectorStatus(data) {
    if (data.error) {
      this.onPlayerCantJoin({ message: data.error })
      this.enableJoin()
    } else {
      if (data.profile) {
        console.log("== NewColony Timing ")
        console.log(data.profile)
      }
      if (data.isGameReady) {
        this.connectNewColonyGame(data.host, data.sectorId)
      }
    }
  }

  async joinMiniGame(miniGameId, options) {
    let data = {
      env: this.getEnvToSendToMatchmaker(),
      region: this.region,
      sessionId: this.sessionId,
      miniGameId: miniGameId
    }

    let chatSelect = document.querySelector(".minigame_chat_language_select")
    data.language = chatSelect.value

    if (this.isLoggedIn()) {
      let idToken = await this.getFirebaseIdToken()
      data["idToken"] = idToken
    }

    if (options.prevMiniGameId) {
      data.prevMiniGameId = options.prevMiniGameId
    }

    if (options.targetMiniGameId) {
      data.targetMiniGameId = options.targetMiniGameId
    }

    if (options.isPrivate) {
      data.isPrivate = true
    }

    if (options.hostPrivateGame) {
      data.hostPrivateGame = true
    }

    this.sendToMatchmaker({ event: "JoinMiniGame", data: data })
  }

  async requestNewColonyFromMatchmaker(isTutorial = false) {
    let data = {
      env: this.getEnvToSendToMatchmaker(),
      region: this.region,
      sessionId: this.sessionId
    }

    if (this.isLoggedIn()) {
      let idToken = await this.getFirebaseIdToken()
      data["idToken"] = idToken
      data["username"] = this.userData.username
      data["uid"] = this.uid
    }

    if (isTutorial) {
      data["isTutorial"] = true
    }

    let colonyName = document.querySelector(".new_colony_name_input").value
    if (colonyName.length > 0) {
      data["name"] = colonyName
    }

    if (this.isStress()) {
      data["stress"] = true
    }

    if (this.getUrlParam().get("row")) {
      data["rowCount"] = this.getUrlParam().get("row")
    }

    if (this.getUrlParam().get("col")) {
      data["colCount"] = this.getUrlParam().get("col")
    }

    this.sendToMatchmaker({ event: "NewColony", data: data })
  }

  isStress() {
    const url = this.getBrowserHref()
    return url.match(new RegExp(".*?stress="))
  }

  getParentUrl() {
    return (window.location != window.parent.location)
            ? document.referrer
            : document.location.href
  }

  sendToMatchmaker(json) {
    let matchmakerSocket = this.getMatchmakerSocket()
    if (matchmakerSocket.readyState !== WebSocket.OPEN) return

    matchmakerSocket.send(JSON.stringify(json))
  }

  isMatchmakerReady() {
    let matchmakerSocket = this.getMatchmakerSocket()
    return matchmakerSocket && matchmakerSocket.readyState === WebSocket.OPEN
  }

  getMatchmakerSocket() {
    return this.gameExplorer.socket
  }


  reserveGameSpot(host) {
    return new Promise((resolve, reject) => {
      ClientHelper.httpRequest(this.getServerHTTPUrl(host) + "/join", {
        success: (result) => {
          let join = JSON.parse(result)
          if (join.success) {
            console.log("reserved spot in " + host)
            resolve(true)
          } else {
            resolve(false)
          }
        },
        error: () => {
          resolve(false)
        }
      })
    })
  }

  hideMenus() {
    this.hideMainMenu()
    this.hideHomeMenu()
    this.gameExplorer.hide()
    this.pvpExplorer.hide()
    this.hideGameInviteMenu()
  }

  onPvPModeMenuBtnClick(e) {
    this.hideMenus()

    this.showBackMainBtn()
    this.pvpExplorer.show()
  }

  onLoadGameMenuBtnClick(e) {
    this.hideMenus()

    this.showBackMainBtn()
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

    if (this.isLoggedIn() && this.game.isCreatedByPlayer()) {
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
    if (this.impy) {
      this.hideMenus()
      let miniGameId = debugMode ? "eWC1CfZymRExY" : "Ap9OYBkw3dQvJ"

      this.miniGameDetailsMenu.open({ gameId: miniGameId })
    }
  }

  onGoogleLoginBtnClick() {
    FirebaseClientHelper.signIn("google")
  }

  onFacebookLoginBtnClick() {
    FirebaseClientHelper.signIn("facebook")
  }

  initAuthentication() {
    document.querySelector(".google_login_btn").addEventListener("click", this.onGoogleLoginBtnClick.bind(this), true)
    document.querySelector(".facebook_login_btn").addEventListener("click", this.onFacebookLoginBtnClick.bind(this), true)

    let hasLocalStorage = this.checkLocalStorageSupport()
    // when iframed in incognito, localStorage is not available if (cookies are blocked)
    // firebase would throw error, and cant even play game.
    // dont init firebase, show warning that cookies must be enable to login (for google sign in to work using their sdk)
    if (hasLocalStorage) {
      FirebaseClientHelper.initFirebase(this.onFirebaseAuth.bind(this))
    }
  }

  getFirebaseHelper() {
    return FirebaseClientHelper
  }

  getFirebaseInstance() {
    return FirebaseClientHelper.getFirebaseInstance()
  }

  showAuthProgress() {
    document.querySelector("#auth_in_progress").style.display = 'block'
  }

  hideAuthProgress() {
    document.querySelector("#auth_in_progress").style.display = 'none'
  }

  updateFriends(friends) {
    if (!friends) return
    friends.forEach((data) => {
      let isPending = data.status === "requested"
      let isIgnored = data.status === "ignored"
      let isAccepted = data.status === "accepted"
      let isRequestSentByMe = data.userUid === this.uid

      if (isAccepted) {
        if (isRequestSentByMe) {
          this.friends[data.friendUid] = data
        } else {
          this.friends[data.userUid] = data
        }
      } else {
        if (isRequestSentByMe) {
          this.sentFriendRequests[data.friendUid] = data
        } else {
          this.receivedFriendRequests[data.userUid] = data
        }
      }

    })
  }

  isMyFriend(uid) {
    return this.friends[uid]
  }

  isFriendRequestPending(uid) {
    return this.sentFriendRequests[uid] ||
           this.receivedFriendRequests[uid]
  }

  async onFirebaseAuth(user) {
    if (user) {
      this.user = user
      this.uid = user.uid

      this.showAuthProgress()
      document.getElementById("logout_btn").style.display = 'inline-block'
      document.querySelector("#social_login_container").style.display = 'none'

      let result = await this.getUserRecord(this.uid)
      this.userData = result
      this.updateFriends(result.friends)

      this.hideAuthProgress()

      if (result.error) {
        if (result.error === 'User not found') {
          this.showUsernameInputForm(user)
        }
      } else {
        this.renderLoggedInUser(this.userData.username)
        let saveEntries = this.userData.saves
        let favorites   = this.userData.favorites
        this.gameExplorer.addMyColonies(saveEntries)
        this.gameExplorer.addFavoriteColonies(favorites)

        if (this.isModerator()) {
          document.body.classList.add("moderator")
        }
      }

      this.onUserAuthenticated()
    } else {
      // No user is signed in.
      this.showAuthContainer()
      this.hideUsernameContainer()
    }
  }

  onPlayerOnline(data) {
    this.onlinePlayers[data.uid] = data
  }

  onPlayerOffline(data) {
    delete this.onlinePlayers[data.uid]
  }

  onFriendRequest(data) {
    this.receivedFriendRequests[data.uid] = data
  }

  isModerator() {
    if (!this.userData) return false
    let mods = ["kuroro", "BigTforLife", "superaaron"]
    return mods.indexOf(this.userData.username) !== -1
  }

  async onUserAuthenticated() {
    let isMod = this.isModerator()

    if (isMod) {
      document.querySelector(".open_ban_list_btn").style.display = 'block'
    }

    this.isUserAuthenticated = true
    if (this.isReadyToPresence()) {
      let idToken = await this.getFirebaseIdToken()
      this.sendToMatchmaker({ event: "Online", data: { idToken: idToken, uid: this.uid } })
    }
  }

  async onMatchmakerConnectSuccess() {
    this.isConnectedToMatchmaker = true

    if (this.isReadyToPresence()) {
      let idToken = await this.getFirebaseIdToken()
      this.sendToMatchmaker({ event: "Online", data: { idToken: idToken, uid: this.uid } })
    }
  }

  isReadyToPresence() {
    return this.isUserAuthenticated && this.isConnectedToMatchmaker
  }

  getUserRecord(uid) {
    let matchmakerUrl = Config[env].matchmakerUrl
    return new Promise((resolve, reject) => {
      ClientHelper.httpRequest(matchmakerUrl + "get_user?uid=" + uid, {
        success: (result) => {
          try {
            let user = JSON.parse(result)
            if (user.error) {
              resolve({ error: user.error })
            } else {
              resolve(user)
            }
          } catch(e) {
            resolve({ error: "Something went wrong" })
          }
        },
        error: () => {
          resolve({ error: "Something went wrong" })
        }
      })
    })
  }

  getFirebaseIdToken() {
    return new Promise((resolve, reject) => {
      if (this.idToken) {
        let isAlmostExpiring = (Date.now() - this.idTokenCreatedAt) > 45 * 60 * 1000 // 45 min
        if (isAlmostExpiring) {
          FirebaseClientHelper.fetchFirebaseIdToken((token) => {
            this.idToken = token
            this.idTokenCreatedAt = Date.now()
            resolve(token)
          })
        } else {
          resolve(this.idToken)
        }
      } else {
        FirebaseClientHelper.fetchFirebaseIdToken((token) => {
          this.idToken = token
          this.idTokenCreatedAt = Date.now()
          resolve(token)
        })
      }
    })
  }

  hideAuthContainer() {
    document.getElementById("authentication_container").style.display = 'none'
  }

  showAuthContainer() {
    document.getElementById("authentication_container").style.display = 'inline-block'
  }

  renderLoggedInUser(username) {
    this.username = username
    this.hideAuthContainer()
    document.getElementById("name_input").style.display = 'none'
    document.getElementById("username_container").style.display = 'block'
    document.getElementById("username").innerText = username

    document.querySelector("#social_login_container").style.display = 'none'

    document.querySelector(".mobile_login_btn").style.display = 'none'
    document.querySelector(".mobile_logout_btn").style.display = 'block'
    document.querySelector(".mobile_username_container").classList.add("logged_in")
    document.querySelector(".mobile_username_container .username").innerText = username
  }

  hideUsernameContainer() {
    document.getElementById("username_container").style.display = 'none'
  }

  showUsernameInputForm() {
    this.hideAuthContainer()
    document.getElementById("username_form_container").style.display = "block"
  }

  hideUsernameInputForm() {
    document.getElementById("username_form_container").style.display = "none"
  }


}

window.main = new Main()
main.run()
