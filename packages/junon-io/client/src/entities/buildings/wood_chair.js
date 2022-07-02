const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class WoodChair extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  getType() {
    return Protocol.definition().BuildingType.WoodChair
  }

  getSpritePath() {
    return "wood_chair.png"
  }

  getConstantsTable() {
    return "Buildings.WoodChair"
  }

}

module.exports = WoodChair
