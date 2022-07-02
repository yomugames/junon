const BaseUnderground = require("./base_underground")
const Constants = require("./../../../../common/constants")
const Protocol = require("./../../../../common/util/protocol")

class Water extends BaseUnderground {
  getType() {
    return Protocol.definition().TerrainType.Water
  }

  getConstantsTable() {
    return "Terrains.Water"
  }

  isWater() {
    return true
  }

  isDrainable() {
    return true
  }

  drainSample() {
    // let damage = Math.floor(this.getMaxHealth() / 3)
    // this.setHealth(this.health - damage)
    return this.constructor.name
  }


}

module.exports = Water
