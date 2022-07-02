const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const RailTrackCommon = require('../../../common/entities/rail_track_common')
const BaseBuilding = require("./base_building")

class RailTrack extends BaseBuilding {

  // not as comprehensive as client..
  static isPositionValid(container, x, y, w, h, angle, player) {
    let blockingWidth  = w * 3
    let blockingHeight = h * 3

    let foregroundHits = container.groundMap.hitTestTile(this.getBox(x, y, blockingWidth, blockingHeight))
    let hasBlockingAsteroid = foregroundHits.find((hit) => { 
      return hit.entity && hit.entity.isForegroundTile()
    })

    let structureHits = container.structureMap.hitTestTile(this.getBox(x, y, blockingWidth, blockingHeight))
    let hasBlockingStructure = structureHits.find((hit) => { 
      return hit.entity && !hit.entity.hasCategory("rail_stop")
    })

    let row = Math.floor(y / Constants.tileSize)
    let col = Math.floor(x / Constants.tileSize)

    return !this.isOnHangar(container, x, y, w, h) &&
           !hasBlockingAsteroid &&
           !hasBlockingStructure &&
           !RailTrackCommon.hasInvalidRailStopNeighbor(container, row, col) &&
           !RailTrackCommon.hasTriangleRailNeighbors(container, row, col) &&
           !container.railMap.isOccupied(x, y, w, h) &&
           !container.armorMap.isOccupied(x, y, w, h) &&
           !container.structureMap.isOccupied(x, y, w, h)
  }

  getConstantsTable() {
    return "Buildings.RailTrack"
  }

  getType() {
    return Protocol.definition().BuildingType.RailTrack
  }

  getMap() {
    return this.container.railMap
  }

  getMapName() {
    return "railMap"
  }

  breakBuilding(lastBreaker) {
    let railNetwork = this.getRailNetwork()
    if (railNetwork && railNetwork.hasMovingTransport()) {
      lastBreaker.showError("Rail Network is currently in use")
      return
    }

    super.breakBuilding(lastBreaker)
  }

  setHealth() {
    // cannot be damaged  
  }

  getNextJunction(direction) {
    let maxIteration = this.getContainer().getRowCount()

    let result

    for (var i = 1; i < maxIteration; i++) {
      let row = this.getRow() + direction[1] * i
      let col = this.getCol() + direction[0] * i

      let structure = this.getContainer().railMap.get(row, col)
      if (!structure) {
        break
      }

      if (structure.hasCategory("rail_track") &&
          structure.isRailJunction()) {
        result = structure
        break
      }
    }

    return result
  }

  isRailJunction() {
    // theres a change in position
    // or it its at edge.. (i.e only one neighbor)
    let neighbors = this.getRailNetwork().manager.getNonEmptyNeighbors({ 
      row: this.getRow(), col: this.getCol(), rowCount: 1, colCount: 1 
    }).filter((hit) => {
      return hit.entity.getType() === this.getType()
    })

    if (neighbors.length <= 1) return true
    if (neighbors.length === 4) return true
    if (neighbors.length === 3) return true

    // 2 neighbors
    let deltaRow = neighbors[0].row - neighbors[1].row
    let deltaCol = neighbors[0].col - neighbors[1].col
    let isDiagonal = Math.abs(deltaRow) === Math.abs(deltaCol)

    return isDiagonal
  }

}

module.exports = RailTrack
