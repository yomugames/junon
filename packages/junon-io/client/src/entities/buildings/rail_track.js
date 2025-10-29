const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Tilable = require("./../../../../common/interfaces/tilable")
const RailTrackCommon = require("./../../../../common/entities/rail_track_common")
const BaseBuilding = require("./base_building")

class RailTrack extends BaseBuilding {

  onBuildingConstructed() {
    super.onBuildingConstructed()
  }

  getRotatedWidth() {
    return Constants.tileSize
  }

  getRotatedHeight() {
    return Constants.tileSize
  }

  static getTextures() {
    if (!this.textures) {
      this.textures = {
        line_zero: PIXI.utils.TextureCache["rail_track.png"],
        line_one: PIXI.utils.TextureCache["rail_track.png"],
        line_two: PIXI.utils.TextureCache["rail_track_all.png"],
        line_two_straight: PIXI.utils.TextureCache["rail_track.png"],
        line_three: PIXI.utils.TextureCache["rail_track_all.png"],
        line_four: PIXI.utils.TextureCache["rail_track_all.png"]
      }
    }

    return this.textures
  }

  redrawSprite() {
    let tiles = this.convertNeighborsToSideHits(this.neighbors)
    for (let direction in tiles) {
      let dontInclude = ["topright", "topleft", "bottomright", "bottomleft"]
      if (!tiles[direction] || dontInclude.indexOf(direction) !== -1) {
        delete tiles[direction]
      }
    }

    this.layoutTile(tiles)
    super.redrawSprite()
  }

  getSideHitTileMaps() {
    return [this.container.railMap]
  }

  getMap() {
    return this.container.railMap
  }

  getAreaInvalidWidth() {
    return this.getWidth() * 3
  }

  getAreaInvalidHeight() {
    return this.getWidth() * 3
  }

  static isPositionValid(container, x, y, w, h, angle, player) {
    let blockingWidth  = w * 3
    let blockingHeight = h * 3

    let foregroundHits = container.map.hitTestTile(this.getBox(x, y, blockingWidth, blockingHeight))
    let hasBlockingAsteroid = foregroundHits.find((hit) => { 
      return hit.entity 
    })

    let row = Math.floor(y / Constants.tileSize)
    let col = Math.floor(x / Constants.tileSize)

    let isOnEdgeOfMap = row === 0 || col === 0 || row === container.getRowCount() - 1 || col === container.getColCount() - 1

    let structureHits = container.structureMap.hitTestTile(this.getBox(x, y, blockingWidth, blockingHeight))
    let hasBlockingStructure = structureHits.find((hit) => { 
      return hit.entity && !hit.entity.hasCategory("rail_stop")
    })

    let structureCenterHit = container.structureMap.get(row, col)
    let isCenterOnInvalidRailStopPosition = structureCenterHit && structureCenterHit.hasCategory("rail_stop")

    return this.isWithinInteractDistance(x, y, player) &&
           !this.isOnHangar(container, x, y, w, h) &&
           !isOnEdgeOfMap &&
           !isCenterOnInvalidRailStopPosition &&
           !RailTrackCommon.hasInvalidRailStopNeighbor(container, row, col) &&
           !RailTrackCommon.hasTriangleRailNeighbors(container, row, col) &&
           !hasBlockingAsteroid &&
           !hasBlockingStructure &&
           !container.railMap.isOccupied(x, y, w, h) &&
           !container.unitMap.isOccupied(x, y, w, h) &&
           !container.armorMap.isOccupied(x, y, blockingWidth, blockingHeight) 
  }


  static hasHorizontalNeighborTrack(container, row, col) {
    let entity = container.railMap.get(row, col - 1) 
    if (entity && entity.getType() === this.getType()) {
      return true
    }

    entity = container.railMap.get(row, col + 1) 
    if (entity && entity.getType() === this.getType()) {
      return true
    }

    return false
  }

  static hasVerticalNeighborTrack(container, row, col) {
    let entity = container.railMap.get(row - 1, col) 
    if (entity && entity.getType() === this.getType()) {
      return true
    }
    
    entity = container.railMap.get(row + 1, col) 
    if (entity && entity.getType() === this.getType()) {
      return true
    }

    return false
  }

  getSpritePath() {
    return 'rail_track.png'
  }

  getType() {
    return Protocol.definition().BuildingType.RailTrack
  }

  getConstantsTable() {
    return "Buildings.RailTrack"
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

  hasConduitInDirection(directionHits) {
    return directionHits.every((hit) => {
      return hit.entity && hit.entity.getType() === this.getType()
    })
  }


}

Object.assign(RailTrack.prototype, Tilable.prototype, {
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


module.exports = RailTrack