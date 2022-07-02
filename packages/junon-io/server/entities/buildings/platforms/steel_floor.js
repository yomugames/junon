const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')
const BaseFloor = require("./base_floor")

class SteelFloor extends BaseFloor {
  getConstantsTable() {
    return "Floors.SteelFloor"
  }

  getType() {
    return Protocol.definition().BuildingType.SteelFloor
  }

}

module.exports = SteelFloor
