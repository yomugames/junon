const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")
const BaseFloor = require("./base_floor")

class PurpleFloor extends BaseFloor {

  getBaseSpritePath() {
    return 'purple_floor.png'
  }

  getType() {
    return Protocol.definition().BuildingType.PurpleFloor
  }

  getConstantsTable() {
    return "Floors.PurpleFloor"
  }

}

module.exports = PurpleFloor
