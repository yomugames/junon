const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class BarTable extends BaseBuilding {
  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  getType() {
    return Protocol.definition().BuildingType.BarTable
  }

  getSpritePath() {
    return "steel_table.png"
  }

  getConstantsTable() {
    return "Buildings.BarTable"
  }

}

module.exports = BarTable
