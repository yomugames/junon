const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class RedPresent extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.RedPresent"
  }

  getType() {
    return Protocol.definition().BuildingType.RedPresent
  }
}

module.exports = RedPresent
