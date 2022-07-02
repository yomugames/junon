const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Fridge extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  openMenu() {
    this.game.storageMenu.open("Fridge", this)
  }

  getType() {
    return Protocol.definition().BuildingType.Fridge
  }

  getSpritePath() {
    return "fridge.png"
  }

  getConstantsTable() {
    return "Buildings.Fridge"
  }

}

module.exports = Fridge
