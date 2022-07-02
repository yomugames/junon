const Asteroid = require("./asteroid")
const Constants = require("./../../../../common/constants")
const Protocol = require("./../../../../common/util/protocol")

class IceAsteroid extends Asteroid {
  getDropType() {
    return Protocol.definition().BuildingType.IceOre
  }

  getType() {
    return Protocol.definition().TerrainType.IceAsteroid
  }

  getConstantsTable() {
    return "Terrains.IceAsteroid"
  }
}

module.exports = IceAsteroid
