const Asteroid = require("./asteroid")
const Constants = require("./../../../../common/constants")
const Protocol = require("./../../../../common/util/protocol")

class IceAsteroid extends Asteroid {
  getDropType() {
    return Protocol.definition().BuildingType.IceOre
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

  getType() {
    return Protocol.definition().TerrainType.IceAsteroid
  }

  getConstantsTable() {
    return "Terrains.IceAsteroid"
  }
}

module.exports = IceAsteroid
