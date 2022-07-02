const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")

class WelcomeMenu extends BaseMenu {
  open(options = {}) {
    super.open(options)

    if (this.game.sector.isTutorial()) {
      document.querySelector(".welcome_menu_header").innerText = i18n.t("Tutorial")
      document.querySelector(".welcome_menu_description").innerText = i18n.t("TutorialWelcomeMessage")
    }


    if (this.game.isAnonymousGame() && this.game.isCreatedByPlayer()) {
      document.querySelector(".welcome_menu_warning_description").innerText = i18n.t('AnonymousGameWarning')
    } else {
      document.querySelector(".welcome_menu_warning_description").innerText = ""
    }
  }

}



module.exports = WelcomeMenu 