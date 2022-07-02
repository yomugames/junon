const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class Core extends BaseBuilding {

  onBuildingPlaced() {
    super.onBuildingPlaced()

    if (this.getPlacer()) {
      this.getPlacer().core = this
    }
  }

  getConstantsTable() {
    return "Buildings.Core"
  }

  getType() {
    return Protocol.definition().BuildingType.Core
  }

  onHealthZero() {
    super.onHealthZero()

    this.removeOwnershipOfBuildings()
  }

  removeOwnershipOfBuildings() {

  }

}

module.exports = Core
