const Bottle = require('./bottle')
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")


class WaterBottle extends Bottle {
  getSpritePath() {
    return 'water_bottle.png'
  }
  
  getTypeName() {
    return this.getConstantName().replace(/([A-Z])/g, ' $1').trim() // space before capital letters
  }

  getType() {
    return Protocol.definition().BuildingType.WaterBottle
  }

  getConstantsTable() {
    return "Equipments.WaterBottle"
  }

}

module.exports = WaterBottle