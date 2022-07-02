const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const OxygenTank = require("./oxygen_tank")

class SmallOxygenTank extends OxygenTank {

  getConstantsTable() {
    return "Buildings.SmallOxygenTank"
  }

  getType() {
    return Protocol.definition().BuildingType.SmallOxygenTank
  }

}

module.exports = SmallOxygenTank

