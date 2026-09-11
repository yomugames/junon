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

  createRock() {
    let neighbors = this.sector.groundMap.getNeighbors(this.row, this.col)
    let groundHit = neighbors.find((neighbor) => {
      return neighbor.entity && (neighbor.entity.isUndergroundTile() || neighbor.entity.isGroundTile())
    })

    if (groundHit) {
      let terrainKlassName = groundHit.entity.constructor.name
      this.sector.createTerrain(terrainKlassName, this.row, this.col)
    }
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
