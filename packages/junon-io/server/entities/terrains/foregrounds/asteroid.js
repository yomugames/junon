const BaseForeground = require("./base_foreground")
const Constants = require("./../../../../common/constants")
const Protocol = require("./../../../../common/util/protocol")

class Asteroid extends BaseForeground {

  isObstacle() {
    return true
  }

  getType() {
    return Protocol.definition().TerrainType.Asteroid
  }

  getDropType() {
    if (this.sector.isLobby()) {
      return Protocol.definition().BuildingType.IronOre
    }

    if (Math.random() <= 0.37) {
      return Protocol.definition().BuildingType.Sand
    } else {
      return Protocol.definition().BuildingType.IronOre
    }
  }

  getConstantsTable() {
    return "Terrains.Asteroid"
  }

}


module.exports = Asteroid
