const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')
const BaseFloor = require("./base_floor")

class StripePlatedFloor extends BaseFloor {

  getConstantsTable() {
    return "Floors.StripePlatedFloor"
  }

  getType() {
    return Protocol.definition().BuildingType.StripePlatedFloor
  }

}

module.exports = StripePlatedFloor
