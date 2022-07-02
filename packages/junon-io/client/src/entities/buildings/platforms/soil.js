const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")
const BaseFloor = require("./base_floor")

class Soil extends BaseFloor {

  getBaseSpritePath() {
    return 'soil.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Soil
  }

  getConstantsTable() {
    return "Floors.Soil"
  }

}

module.exports = Soil
