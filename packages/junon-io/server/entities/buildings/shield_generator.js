const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class ShieldGenerator extends BaseBuilding {

  onConstructionFinished() {
    super.onConstructionFinished()

    this.createOrUpgradeShield()
  }

  createOrUpgradeShield() {
    if (!this.container.shield) {
      this.container.createNewShield()
    } else {
      this.container.shield.increaseLevel()
    }
  }

  getConstantsTable() {
    return "Buildings.ShieldGenerator"
  }

  getType() {
    return Protocol.definition().BuildingType.ShieldGenerator
  }

}

module.exports = ShieldGenerator
