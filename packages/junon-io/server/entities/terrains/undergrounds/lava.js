const BaseUnderground = require("./base_underground")
const Constants = require("./../../../../common/constants")
const Protocol = require("./../../../../common/util/protocol")

class Lava extends BaseUnderground {
  isOnFire() {
    return true
  }

  isLava() {
    return true
  }

  getType() {
    return Protocol.definition().TerrainType.Lava
  }

  getConstantsTable() {
    return "Terrains.Lava"
  }
}

module.exports = Lava
