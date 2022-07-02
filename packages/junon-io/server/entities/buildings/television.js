const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class Television extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.Television"
  }

  getType() {
    return Protocol.definition().BuildingType.Television
  }

}

module.exports = Television
