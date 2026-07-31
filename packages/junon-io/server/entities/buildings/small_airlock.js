const Airlock = require("./airlock")
const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')

class SmallAirlock extends Airlock {

  getConstantsTable() {
    return "Buildings.SmallAirlock"
  }

  isAutomatic() {
    return false
  }

  getType() {
    return Protocol.definition().BuildingType.SmallAirlock
  }

  getDoorLengthDivisor() {
    return 1
  }

  shouldObstruct(body, hit) {
    return !this.isOpen
  }


}

module.exports = SmallAirlock
