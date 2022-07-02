const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")
const BaseFloor = require("./base_floor")

class TiledFloor extends BaseFloor {

  getBaseSpritePath() {
    return 'tiled_floor.png'
  }

  getType() {
    return Protocol.definition().BuildingType.TiledFloor
  }

  getConstantsTable() {
    return "Floors.TiledFloor"
  }

}

module.exports = TiledFloor
