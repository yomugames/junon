const BaseTerrain = require("./../base_terrain")

class BaseUnderground extends BaseTerrain {

  isUndergroundTile() {
    return true
  }

  isDrainable() {
    return false
  }

  onBuildingPlaced(row, col) {
    super.onBuildingPlaced(row, col)

    this.sector.mapGenerator.registerLiquid(this)
  }

  unregister() {
    super.unregister()

    this.sector.mapGenerator.unregisterLiquid(this)
  }

}

module.exports = BaseUnderground
