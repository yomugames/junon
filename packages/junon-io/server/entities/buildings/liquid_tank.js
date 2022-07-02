const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class LiquidTank extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.LiquidTank"
  }

  getType() {
    return Protocol.definition().BuildingType.LiquidTank
  }

  isDrainable() {
    return true
  }

  getBottleFillAmount() {
    return 50
  }

  drainSample() {
    let liquidStorage = this.resourceStorages.liquid
    if (liquidStorage.getUsage() === 0) return null

    liquidStorage.setUsage(liquidStorage.getUsage() - this.getBottleFillAmount())
    return "Water"
  }

  interact(user) {
    let handEquipment = user.getHandEquipment()
    if (handEquipment && handEquipment.getType() === Protocol.definition().BuildingType.WaterBottle) {
      if (handEquipment.hasEnoughWater()) {
        this.fillResource("liquid", this.getBottleFillAmount())
        handEquipment.drainSample()
      }
    } else if (handEquipment && handEquipment.getType() === Protocol.definition().BuildingType.Bottle) {
      // draw water
      handEquipment.draw(user, this)

      if (user && user.isPlayer()) {
        user.walkthroughManager.handle("collect_water")
      }
    }
  }

}

module.exports = LiquidTank

