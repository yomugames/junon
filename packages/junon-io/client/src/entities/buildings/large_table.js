const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class LargeTable extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  getType() {
    return Protocol.definition().BuildingType.LargeTable
  }

  getSpritePath() {
    return "large_steel_table.png"
  }

  getConstantsTable() {
    return "Buildings.LargeTable"
  }

}

module.exports = LargeTable
