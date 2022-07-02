const Asteroid = require("./asteroid")
const Constants = require("./../../../../common/constants")
const Protocol = require("./../../../../common/util/protocol")

class MeteoriteAsteroid extends Asteroid {
  getDropType() {
    return Protocol.definition().BuildingType.Meteorite
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
    return Protocol.definition().TerrainType.MeteoriteAsteroid
  }

  getConstantsTable() {
    return "Terrains.MeteoriteAsteroid"
  }
}

module.exports = MeteoriteAsteroid
