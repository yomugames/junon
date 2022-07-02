const Asteroid = require("./asteroid")
const Constants = require("./../../../../common/constants")
const Protocol = require("./../../../../common/util/protocol")

class SteelAsteroid extends Asteroid {
  getDropType() {
    return Protocol.definition().BuildingType.SteelOre
  }

  getType() {
    return Protocol.definition().TerrainType.SteelAsteroid
  }

  getConstantsTable() {
    return "Terrains.SteelAsteroid"
  }
}

module.exports = SteelAsteroid
