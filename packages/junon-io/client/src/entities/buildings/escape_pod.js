const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class EscapePod extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)

    if (!this.sector.isLobby()) {
      this.onEffectAdded("residue")
    }
  }

  openMenu() {
    if (!this.sector.isLobby()) {
      this.game.storageMenu.open("Escape Pod", this)
    }
  }

  getActionTooltipMessage() {
    if (this.sector.isLobby()) {
      return "Leave Station"
    } else {
      return null
    }
  }

  getType() {
    return Protocol.definition().BuildingType.EscapePod
  }

  getSpritePath() {
    return "escape_pod.png"
  }

  getConstantsTable() {
    return "Buildings.EscapePod"
  }

}

module.exports = EscapePod
