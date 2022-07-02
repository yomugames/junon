const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Constants = require("./../../../common/constants.json")

class EndGameMenu extends BaseMenu {
  onMenuConstructed() {
  }

  initListeners() {
    super.initListeners()

    this.el.querySelector(".play_again_btn").addEventListener("keyup", this.onPlayAgainBtnClick.bind(this))
    this.el.querySelector(".spectate_btn").addEventListener("click", this.onSpectateBtnClick.bind(this))
  }

  onPlayAgainBtnClick(e) {

  }

  onSpectateBtnClick(e) {

  }

  open(options = {}) {
    super.open(options)
  }

}



module.exports = EndGameMenu 