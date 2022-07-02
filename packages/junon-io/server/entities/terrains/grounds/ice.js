const BaseGround = require("./base_ground")
const Constants = require("./../../../../common/constants")
const Protocol = require("./../../../../common/util/protocol")

class Ice extends BaseGround {
  getType() {
    return Protocol.definition().TerrainType.Ice
  }

  getConstantsTable() {
    return "Terrains.Ice"
  }
}

module.exports = Ice
