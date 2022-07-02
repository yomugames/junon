const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const ShipBuilding = require("./ship_building")

class Thruster extends ShipBuilding {
  onBuildingPlaced() {
    super.onBuildingPlaced()

    this.SPEED_BOOST = 6 * Constants.globalSpeedMultiplier

    if (this.container.isMovable()) {
      this.container.setSpeed(this.container.getSpeed() + this.SPEED_BOOST)
    }
  }

  unregister() {
    super.unregister()
  }

  getConstantsTable() {
    return "Buildings.Thruster"
  }

  remove() {
    super.remove()

    if (this.container.isMovable()) {
      this.container.setSpeed(this.container.speed - this.SPEED_BOOST)
    }
  }

  getType() {
    return Protocol.definition().BuildingType.Thruster
  }

}

module.exports = Thruster

