const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')
const BaseFloor = require("./base_floor")

class CarpetFloor extends BaseFloor {

  isCarpet() {
    return true
  }

  getConstantsTable() {
    return "Floors.CarpetFloor"
  }

  getType() {
    return Protocol.definition().BuildingType.CarpetFloor
  }

}

module.exports = CarpetFloor
