const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Conveyor extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  getType() {
    return Protocol.definition().BuildingType.Conveyor
  }

  getSpritePath() {
    return "conveyor.png"
  }

  getConstantsTable() {
    return "Buildings.Conveyor"
  }

}

module.exports = Conveyor
