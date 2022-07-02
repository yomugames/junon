const ClientHelper = require("../util/client_helper")
const KeyboardMap = require("../entities/keyboard_map")
const Cookies = require("js-cookie")
const Constants = require("./../../../common/constants.json")
const Helper = require("./../../../common/helper")

class MiniGameDetailsMenu {
  constructor(main) {
    this.main = main
    this.game = main.game

    this.initListeners()
  }

  open(options = {}) {
    let isInsideGame = this.game.player
    if (isInsideGame) {
      this.main.gameExplorer.joinMiniGame(options.gameId)
      return
    }

    this.gameId = options.gameId

    let minigameData = this.main.gameExplorer.getMiniGame(this.gameId)
    let minigameName = minigameData.name.replace(/[^\w]+/g,"")
    let value = minigameName + "-" + this.gameId

    if (!this.main.getUrlParam().get("game")) {
      let newSearchParam = ClientHelper.replaceQueryParam('minigame', value, window.location.search)
      history.replaceState('','', newSearchParam)
    }

    this.renderDetails(minigameData)
    this.show()
  }

  renderDetails(minigameData) {
    // render player count
    let languageOptions = document.querySelectorAll(".minigame_chat_language_select option")
    for (var i = 0; i < languageOptions.length; i++) {
      let languageOption = languageOptions[i]
      let language = languageOption.value
      let count = 0  
      if (minigameData.playerCountByLanguage && minigameData.playerCountByLanguage[language]) {
        count = minigameData.playerCountByLanguage[language]
      }
      
      let languageMap = {
        "en": "English",
        "ru": "Русский",
        "ja": "日本語",
      } 

      languageOption.innerText = languageMap[language] + " - " + count + " players"
    }

    let imageBasePath = "/assets/images/background/"
    if (this.gameId === "l8v7ezWMvnGeC" || this.gameId === "uLHpXWb2koXYe") {
      document.querySelector(".minigame_details_container .minigame_title").innerText = "Bed Wars"
      document.querySelector(".minigame_details_container .minigame_description").innerText = "Defend your bed and destroy other teams bed"
      document.querySelector(".minigame_thumbnail_1").href = imageBasePath + "bedwars_1.jpg"
      document.querySelector(".minigame_thumbnail_1 img").src = imageBasePath + "bedwars_1.jpg"
      document.querySelector(".minigame_thumbnail_2").href = imageBasePath + "bedwars_2.jpg"
      document.querySelector(".minigame_thumbnail_2 img").src = imageBasePath + "bedwars_2.jpg"
    } else if (this.gameId === "BPF0uFha5QLUr" || this.gameId === "PnGkJd5xZsb0v") {
      document.querySelector(".minigame_details_container .minigame_title").innerText = i18n.t("Domination.Title")
      document.querySelector(".minigame_details_container .minigame_description").innerText = i18n.t("Domination.Description")
      document.querySelector(".minigame_thumbnail_1").href = imageBasePath + "pvp_1.jpg"
      document.querySelector(".minigame_thumbnail_1 img").src = imageBasePath + "pvp_1.jpg"
      document.querySelector(".minigame_thumbnail_2").href = imageBasePath + "pvp_2.jpg"
      document.querySelector(".minigame_thumbnail_2 img").src = imageBasePath + "pvp_2.jpg"
    } else if (this.gameId === "vbj91eofmFCiu" || this.gameId === "YcdqgbswlAqRi") {
      document.querySelector(".minigame_details_container .minigame_title").innerText = "Tower Defense"
      document.querySelector(".minigame_details_container .minigame_description").innerText = "Protect your core from incoming enemy waves"
      document.querySelector(".minigame_thumbnail_1").href = imageBasePath + "td_1.jpg"
      document.querySelector(".minigame_thumbnail_1 img").src = imageBasePath + "td_1.jpg"
      document.querySelector(".minigame_thumbnail_2").href = imageBasePath + "td_2.jpg"
      document.querySelector(".minigame_thumbnail_2 img").src = imageBasePath + "td_2.jpg"
    } else {
      document.querySelector(".minigame_details_container .minigame_title").innerText = i18n.t("FindTheImposter.Title")
      document.querySelector(".minigame_details_container .minigame_description").innerText = i18n.t("FindTheImposter.Description")
      document.querySelector(".minigame_thumbnail_1").href = imageBasePath + "role_crew.jpg"
      document.querySelector(".minigame_thumbnail_1 img").src = imageBasePath + "role_crew.jpg"
      document.querySelector(".minigame_thumbnail_2").href = imageBasePath + "meeting.jpg"
      document.querySelector(".minigame_thumbnail_2 img").src = imageBasePath + "meeting.jpg"
    }
  }

  initListeners() {
    document.querySelector(".join_minigame_btn").addEventListener("click", this.onJoinMiniGameBtnClick.bind(this), true)
    document.querySelector(".host_minigame_btn").addEventListener("click", this.onHostMiniGameBtnClick.bind(this), true)
  }

  onJoinMiniGameBtnClick() {
    this.main.gameExplorer.joinMiniGame(this.gameId) 
  }

  onHostMiniGameBtnClick() {
    this.main.gameExplorer.joinMiniGame(this.gameId, { hostPrivateGame: true }) 
  }

  show() {
    document.querySelector(".minigame_details_container").style.display = 'block'
  }

  hide() {
    document.querySelector(".minigame_details_container").style.display = 'none'
  }


}

module.exports = MiniGameDetailsMenu