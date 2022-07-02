const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class RedPresent extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  getType() {
    return Protocol.definition().BuildingType.RedPresent
  }

  getSpritePath() {
    return "red_present.png"
  }

  getConstantsTable() {
    return "Buildings.RedPresent"
  }

}

module.exports = RedPresent