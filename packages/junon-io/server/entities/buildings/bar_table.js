const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class BarTable extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.BarTable"
  }

  getType() {
    return Protocol.definition().BuildingType.BarTable
  }

}

module.exports = BarTable