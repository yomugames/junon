const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")
const BaseFloor = require("./base_floor")

class GreenFloor extends BaseFloor {

  getBaseSpritePath() {
    return 'green_floor.png'
  }

  getType() {
    return Protocol.definition().BuildingType.GreenFloor
  }

  getConstantsTable() {
    return "Floors.GreenFloor"
  }

}

module.exports = GreenFloor
