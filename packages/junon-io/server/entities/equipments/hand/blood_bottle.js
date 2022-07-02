const Bottle = require('./bottle')
const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")

class BloodBottle extends Bottle {
  isSampleValid(sample) {
    return sample === 'Blood'
  }

  getType() {
    return Protocol.definition().BuildingType.BloodBottle
  }


  shouldBeFullOnSpawn() {
    return true
  }

  getConstantsTable() {
    return "Equipments.BloodBottle"
  }

}

module.exports = BloodBottle
