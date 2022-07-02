const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class GreenPresent extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  getType() {
    return Protocol.definition().BuildingType.GreenPresent
  }

  getSpritePath() {
    return "green_present.png"
  }

  getConstantsTable() {
    return "Buildings.GreenPresent"
  }

}

module.exports = GreenPresent