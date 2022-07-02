const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Television extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  getType() {
    return Protocol.definition().BuildingType.Television
  }

  getSpritePath() {
    return "television.png"
  }

  getConstantsTable() {
    return "Buildings.Television"
  }

}

module.exports = Television
