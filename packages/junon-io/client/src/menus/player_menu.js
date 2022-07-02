const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Item = require("./../entities/item")

class PlayerMenu extends BaseMenu {
  onMenuConstructed() {

  }

  initProcessing() {
  }

  initListeners() {
    super.initListeners()

    this.el.querySelector(".add_player_btn").addEventListener("click", this.onAddToTeamBtnClick.bind(this))
    this.el.querySelector(".kick_player_btn").addEventListener("click", this.onKickFromTeamBtnClick.bind(this))
  }

  onAddToTeamBtnClick() {

  }

  onKickFromTeamBtnClick() {

  }

  open(player) {
    super.open()

    if (player.isSameTeam(this.game.player)) {
      this.el.querySelector(".add_player_team_container").style.display = 'none'
      this.el.querySelector(".kick_player_team_container").style.display = 'block'
    } else {
      this.el.querySelector(".add_player_team_container").style.display = 'block'
      this.el.querySelector(".kick_player_team_container").style.display = 'none'
    }
  }

  cleanup() {

  }

}



module.exports = PlayerMenu