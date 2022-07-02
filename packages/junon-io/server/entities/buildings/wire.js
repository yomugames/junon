const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")
const BaseDistribution = require("./base_distribution")

class Wire extends BaseDistribution {

  getConstantsTable() {
    return "Buildings.Wire"
  }

  getType() {
    return Protocol.definition().BuildingType.Wire
  }

}

module.exports = Wire
