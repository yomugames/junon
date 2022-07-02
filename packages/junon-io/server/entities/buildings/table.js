const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class Table extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.Table"
  }

  getType() {
    return Protocol.definition().BuildingType.Table
  }

}

module.exports = Table
