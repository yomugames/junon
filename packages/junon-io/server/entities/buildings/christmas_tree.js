const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class ChristmasTree extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.ChristmasTree"
  }

  getType() {
    return Protocol.definition().BuildingType.ChristmasTree
  }

}

module.exports = ChristmasTree
