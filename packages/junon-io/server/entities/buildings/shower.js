const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class Shower extends BaseBuilding {


  onConstructionFinished() {
    super.onConstructionFinished()

    this.isOn = false
  }

  getConstantsTable() {
    return "Buildings.Shower"
  }

  interact(user) {
    this.isOn = !this.isOn

    if (this.isOn) {
      this.container.addProcessor(this)
    } else {
      this.container.removeProcessor(this)
    }
  }

  executeTurn() {
    const isOneSecondInterval = this.game.timestamp % (Constants.physicsTimeStep * 1) === 0
    if (!isOneSecondInterval) return

    let platform = this.getStandingPlatform()
    if (platform) {
      platform.floodFillWater()
    }
  }

  unregister() {
    super.unregister()
    this.container.removeProcessor(this)
  }


  getType() {
    return Protocol.definition().BuildingType.Shower
  }

}

module.exports = Shower
