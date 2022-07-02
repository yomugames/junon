const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const SocketUtil = require("../../util/socket_util")

class SteelCrate extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  openMenu() {
    this.game.storageMenu.open("Steel Crate", this)
  }

  getType() {
    return Protocol.definition().BuildingType.SteelCrate
  }

  getSpritePath() {
    return "steel_crate.png"
  }

  getConstantsTable() {
    return "Buildings.SteelCrate"
  }

}

module.exports = SteelCrate
