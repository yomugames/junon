const SocketUtil = require("./../util/socket_util")
const BaseMenu = require("./base_menu")
const Mobs = require("./../entities/mobs/index")
const Ores = require("./../entities/ores/index")
const Item = require("./../entities/item")
const Buildings = require("./../entities/buildings/index")
const Equipments = require("./../entities/equipments/index")
const Helper = require("./../../../common/helper")

class SelectDifficultyMenu extends BaseMenu {
  onMenuConstructed() {
    this.el.querySelector(".accept_game_mode_btn").addEventListener("click", this.onAcceptGameModeBtnClick.bind(this), true)
    this.el.querySelector(".game_modes_list").addEventListener("click", this.onGameModesListClick.bind(this), true)
    this.el.querySelector(".game_modes_list").addEventListener("dblclick", this.onGameModesListDblClick.bind(this), true)
    this.el.querySelector(".game_modes_list").addEventListener("keyup", this.onGameModesListKeyup.bind(this), true)
  }

  onGameModesListDblClick() {
    this.onAcceptGameModeBtnClick()
  }

  onGameModesListKeyup(e) {
    if (e.which === 13) {
      this.onAcceptGameModeBtnClick()
    }
  }

  onGameModesListClick(e) {
    let gameMode = e.target.closest(".game_mode")
    if (gameMode) {
      let selectedGameMode = this.el.querySelector(".game_mode.selected")
      if (selectedGameMode) {
        selectedGameMode.classList.remove("selected")
      }
      gameMode.classList.add("selected")
    }
  }

  showGameMode(gameMode) {
    if (gameMode) return // gameMode already exist

    if (!this.game.player) return
    if (!this.game.player.isSectorOwner()) return

    let peacefulHardcoreModeDate = (new Date(2020, 7, 19)).getTime() / 1000
    if (this.game.sector.createdAt < peacefulHardcoreModeDate) return

    let selectedGameMode = this.el.querySelector(".game_mode.selected")
    if (selectedGameMode) {
      selectedGameMode.classList.remove("selected")
    }

    selectedGameMode = this.el.querySelector(".game_mode[data-mode='survival']")
    selectedGameMode.classList.add("selected")

    this.open()
  }

  onAcceptGameModeBtnClick(e) {
    let selectedGameMode = this.el.querySelector(".game_mode.selected")
    if (!selectedGameMode) return

    let action = selectedGameMode.dataset.mode + "Mode"

    SocketUtil.emit("SectorAction", { action: action })

  }

}

module.exports = SelectDifficultyMenu