const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")
const Ammos = require("./../ammos/index")

class ResearchTable extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.ResearchTable"
  }

  getType() {
    return Protocol.definition().BuildingType.ResearchTable
  }

}


module.exports = ResearchTable

