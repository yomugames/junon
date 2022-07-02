const Airlock = require("./airlock")
const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')

class ManualAirlock extends Airlock {

  getConstantsTable() {
    return "Buildings.ManualAirlock"
  }

  isAutomatic() {
    return false
  }

  getType() {
    return Protocol.definition().BuildingType.ManualAirlock
  }

  getDoorLengthDivisor() {
    return 1
  }

  shouldObstruct(body, hit) {
    return !this.isOpen
  }


}

module.exports = ManualAirlock
