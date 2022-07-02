const BaseGround = require("./base_ground")
const Constants = require("./../../../../common/constants")
const Protocol = require("./../../../../common/util/protocol")

class LavaRock extends BaseGround {
  getType() {
    return Protocol.definition().TerrainType.LavaRock
  }

  getConstantsTable() {
    return "Terrains.LavaRock"
  }
}

module.exports = LavaRock
