const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class ResearchTable extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  getType() {
    return Protocol.definition().BuildingType.ResearchTable
  }

  getSpritePath() {
    return "research_table_2.png"
  }

  getConstantsTable() {
    return "Buildings.ResearchTable"
  }

}

module.exports = ResearchTable
