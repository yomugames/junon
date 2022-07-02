const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")
const BaseFloor = require("./base_floor")

class PlatedFloor extends BaseFloor {

  getBaseSpritePath() {
    return 'plated_floor.png'
  }

  getType() {
    return Protocol.definition().BuildingType.PlatedFloor
  }

  getConstantsTable() {
    return "Floors.PlatedFloor"
  }

}

module.exports = PlatedFloor
