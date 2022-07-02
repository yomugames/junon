const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')
const BaseFloor = require("./base_floor")

class WoodFloor extends BaseFloor {

  getConstantsTable() {
    return "Floors.WoodFloor"
  }

  getType() {
    return Protocol.definition().BuildingType.WoodFloor
  }

}

module.exports = WoodFloor
