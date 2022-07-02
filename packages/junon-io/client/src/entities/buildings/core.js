const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Drainable = require("./../../../../common/interfaces/drainable")

class Core extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)

  }

  getType() {
    return Protocol.definition().BuildingType.Core
  }

  getSpritePath() {
    return "core_2.png"
  }

  getConstantsTable() {
    return "Buildings.Core"
  }

}

module.exports = Core
