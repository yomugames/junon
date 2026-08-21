const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class SmallWoodTable extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  getType() {
    return Protocol.definition().BuildingType.SmallWoodTable
  }

  getSpritePath() {
    return "small_wood_table.png"
  }

  getConstantsTable() {
    return "Buildings.SmallWoodTable"
  }

}

module.exports = SmallWoodTable
