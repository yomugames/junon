const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class SlaversTable extends BaseBuilding {

  onConstructionFinished() {
    super.onConstructionFinished()

    if (this.isPlacedByPlayerAction) {
      this.game.eventManager.createSlaveTraderFor(this.owner, this)

      this.getPlacer() && this.getPlacer().progressTutorial("main", 15)
    }
  }

  getConstantsTable() {
    return "Buildings.SlaversTable"
  }

  getType() {
    return Protocol.definition().BuildingType.SlaversTable
  }

}

module.exports = SlaversTable
