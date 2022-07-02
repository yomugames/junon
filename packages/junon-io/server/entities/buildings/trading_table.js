const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class TradingTable extends BaseBuilding {

  onConstructionFinished() {
    super.onConstructionFinished()

    if (this.isPlacedByPlayerAction) {
      this.game.eventManager.createTraderFor(this.owner, this)

      this.getPlacer() && this.getPlacer().progressTutorial("main", 11)
    }
  }

  getConstantsTable() {
    return "Buildings.TradingTable"
  }

  getType() {
    return Protocol.definition().BuildingType.TradingTable
  }

}

module.exports = TradingTable
