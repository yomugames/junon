const Bottle = require('./bottle')
const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")

class WaterBottle extends Bottle {
  isSampleValid(sample) {
    return sample === 'Water'
  }

  getType() {
    return Protocol.definition().BuildingType.WaterBottle
  }

  hasEnoughWater() {
    return this.getUsage() > 0
  }


  shouldBeFullOnSpawn() {
    return true
  }

  getConstantsTable() {
    return "Equipments.WaterBottle"
  }

}

module.exports = WaterBottle
