const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Chair extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  getType() {
    return Protocol.definition().BuildingType.Chair
  }

  getSpritePath() {
    return "steel_chair.png"
  }

  getConstantsTable() {
    return "Buildings.Chair"
  }

}

module.exports = Chair
