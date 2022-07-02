const BaseGround = require("./base_ground")
const Constants = require("./../../../../common/constants")
const Protocol = require("./../../../../common/util/protocol")

class Rock extends BaseGround {
  getType() {
    return Protocol.definition().TerrainType.Rock
  }

  getConstantsTable() {
    return "Terrains.Rock"
  }

  isRockFloor() {
    return true
  }


}

module.exports = Rock
