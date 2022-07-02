const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class Conveyor extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.Conveyor"
  }

  getType() {
    return Protocol.definition().BuildingType.Conveyor
  }

}

module.exports = Conveyor

