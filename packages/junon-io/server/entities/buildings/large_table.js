const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class LargeTable extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.LargeTable"
  }

  getType() {
    return Protocol.definition().BuildingType.LargeTable
  }

}

module.exports = LargeTable
