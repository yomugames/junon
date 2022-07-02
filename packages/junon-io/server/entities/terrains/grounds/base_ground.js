const BaseTerrain = require("./../base_terrain")

class BaseGround extends BaseTerrain {
  isGroundTile() {
    return true
  }

  onBuildingPlaced(row, col) {
    super.onBuildingPlaced(row, col)

    this.sector.mapGenerator.registerGround(this)
  }

  unregister() {
    super.unregister()

    this.sector.mapGenerator.unregisterGround(this)
  }
}

module.exports = BaseGround
