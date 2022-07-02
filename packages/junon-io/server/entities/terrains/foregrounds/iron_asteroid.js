const Asteroid = require("./asteroid")
const Constants = require("./../../../../common/constants")
const Protocol = require("./../../../../common/util/protocol")

class IronAsteroid extends Asteroid {
  getDropType() {
    return Protocol.definition().BuildingType.IronOre
  }

  getType() {
    return Protocol.definition().TerrainType.IronAsteroid
  }

  getConstantsTable() {
    return "Terrains.IronAsteroid"
  }
}

module.exports = IronAsteroid
