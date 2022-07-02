const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Table = require("./table")

class TradingTable extends Table {

  getType() {
    return Protocol.definition().BuildingType.TradingTable
  }

  getSpritePath() {
    return "trading_table.png"
  }

  getConstantsTable() {
    return "Buildings.TradingTable"
  }

}

module.exports = TradingTable
