const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Table = require("./table")

class SlaversTable extends Table {

  getType() {
    return Protocol.definition().BuildingType.SlaversTable
  }

  getSpritePath() {
    return "slavers_table.png"
  }

  getConstantsTable() {
    return "Buildings.SlaversTable"
  }

}

module.exports = SlaversTable
