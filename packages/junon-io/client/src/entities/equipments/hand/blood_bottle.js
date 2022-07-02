const Bottle = require('./bottle')
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")


class BloodBottle extends Bottle {
  getSpritePath() {
    return 'blood_bottle.png'
  }
  
  getTypeName() {
    return this.getConstantName().replace(/([A-Z])/g, ' $1').trim() // space before capital letters
  }

  getType() {
    return Protocol.definition().BuildingType.BloodBottle
  }

  getConstantsTable() {
    return "Equipments.BloodBottle"
  }

}

module.exports = BloodBottle