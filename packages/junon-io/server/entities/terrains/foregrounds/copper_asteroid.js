const Asteroid = require("./asteroid")
const Constants = require("./../../../../common/constants")
const Protocol = require("./../../../../common/util/protocol")

class CopperAsteroid extends Asteroid {
  getDropType() {
    return Protocol.definition().BuildingType.CopperOre
  }

  getType() {
    return Protocol.definition().TerrainType.CopperAsteroid
  }

  getConstantsTable() {
    return "Terrains.CopperAsteroid"
  }
}

module.exports = CopperAsteroid
