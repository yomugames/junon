const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")
const BaseFloor = require("./base_floor")

class WoodFloor extends BaseFloor {

  getBaseSpritePath() {
    return 'wood_floor.png'
  }

  getType() {
    return Protocol.definition().BuildingType.WoodFloor
  }

  getConstantsTable() {
    return "Floors.WoodFloor"
  }

}

module.exports = WoodFloor
