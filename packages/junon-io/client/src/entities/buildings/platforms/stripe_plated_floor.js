const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")
const BaseFloor = require("./base_floor")

class StripePlatedFloor extends BaseFloor {

  getBaseSpritePath() {
    return 'stripe_plated_floor.png'
  }

  getType() {
    return Protocol.definition().BuildingType.StripePlatedFloor
  }

  getConstantsTable() {
    return "Floors.StripePlatedFloor"
  }

}

module.exports = StripePlatedFloor
