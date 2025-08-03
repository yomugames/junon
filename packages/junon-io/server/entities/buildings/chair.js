const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class Chair extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.Chair"
  }

  getType() {
    return Protocol.definition().BuildingType.Chair
  }
}

module.exports = Chair
