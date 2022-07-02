const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')
const BaseFloor = require("./base_floor")

class GreenFloor extends BaseFloor {

  getConstantsTable() {
    return "Floors.GreenFloor"
  }

  getType() {
    return Protocol.definition().BuildingType.GreenFloor
  }

}

module.exports = GreenFloor
