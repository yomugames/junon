const BaseDistribution = require("./base_distribution")
const Tilable = require("./../../../../common/interfaces/tilable")

class Conduit extends BaseDistribution {

  onBuildingConstructed() {
    super.onBuildingConstructed()
  }

  getMap() {
    return this.container[this.getTileMapName()]
  }

  getTileMapName() {
    return "distributionMap"
  }

  static getTextures() {
    throw "must implement Conduit#getTextures"
  }

  redrawSprite() {
    let tiles = this.convertNeighborsToSideHits(this.neighbors)
    for (let direction in tiles) {
      if (!tiles[direction]) {
        delete tiles[direction]
      }
    }

    this.layoutTile(tiles)
    super.redrawSprite()
  }

  hasConduitInDirection(directionHits) {
    throw "must implement Conduit#hasConduitInDirection"
  }

  getConduits(sideHits) {
    let conduits = {}

    // find out which ones are conduits
    for (let direction in sideHits) {
      let directionHits = sideHits[direction]
      if (this.hasConduitInDirection(directionHits)) {
        conduits[direction] = true
      }
    }

    return conduits
  }

  getSideHitTileMaps() {
    return [this.getMap(), this.container.structureMap]
  }

}

Object.assign(Conduit.prototype, Tilable.prototype, {
  getTextures() {
    return this.constructor.getTextures()
  },
  getTileSprite() {
    return this.buildingSprite
  },
  getSides() {
    const sideHits = this.getSideHits()
    return this.getConduits(sideHits)
  }
})



module.exports = Conduit