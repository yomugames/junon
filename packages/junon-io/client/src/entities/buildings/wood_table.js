const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class WoodTable extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  getType() {
    return Protocol.definition().BuildingType.WoodTable
  }

  getSpritePath() {
    return "wood_table.png"
  }

  getConstantsTable() {
    return "Buildings.WoodTable"
  }

}

module.exports = WoodTable
