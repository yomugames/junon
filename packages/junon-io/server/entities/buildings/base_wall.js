const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseFloor = require("./platforms/base_floor")

class BaseWall extends BaseFloor {
  static isPositionValid(container, x, y, w, h, angle, player) {
    const hits = container.platformMap.hitTestTile(this.prototype.getBox(x, y, w, h))
    const isOnSoil = hits.every((hit) => { return hit.entity && hit.entity.hasCategory("soil") })

    return !isOnSoil &&
           this.isOnValidPlatform(container, x, y, w, h, angle, player) &&
           !this.isOnHangar(container, x, y, w, h) &&
           !this.hasRailNeighbor(container, x, y, w, h) &&
           !container.railMap.isOccupied(x, y, w, h) &&
           !container.armorMap.isOccupied(x, y, w, h) &&
           !container.structureMap.isOccupied(x, y, w, h)
  }

  replaceExistingTiles() {
    // no need to worry about overlap
  }

  getUpgradeCost() {
    return 300
  }

  onBuildingPlaced() {
    super.onBuildingPlaced()

    this.replaceSoilIfPresent()
  }

  isWall() {
    return true
  }

  replaceSoilIfPresent() {
    let entity = this.container.platformMap.get(this.getRow(), this.getCol())
    if (entity && entity.hasCategory("soil")) {
      entity.remove()
    }
  }

  getOppositeRoomFrom(entity) {
    let result

    let occupiedRoom = entity.getOccupiedRoom()
    if (!occupiedRoom) return

    if (!this.rooms) return

    let isWallInEntityRoom = this.rooms[occupiedRoom.id]
    if (!isWallInEntityRoom) {
      return null
    }

    for (let roomId in this.rooms) {
      let room = this.rooms[roomId]
      if (entity.getOccupiedRoom() !== room) {
        result = room
      }
    }

    return result
  }

  canBeSalvagedBy(player) {
    let oppositeRoom = this.getOppositeRoomFrom(player)

    if (oppositeRoom && 
        oppositeRoom.getDoorCount() > 0 &&
        !oppositeRoom.canEnter(player)) {
      return false
    }

    return super.canBeSalvagedBy(player)
  }

  getEffects() {
    return []
  }

  getMap() {
    return this.container.armorMap
  }

  getMaxHealth() {
    let maxHealth = super.getMaxHealth()
    if (this.level === 1) return maxHealth * 2
    return maxHealth
  }

  getGroup() {
    return "armors"
  }

  getMapName() {
    return "armorMap"
  }

  addToRoom(room) {
    let hit = { row: this.getRow(), col: this.getCol(), entity: this }
    room.addEdgeTile(hit)
  }

  getChunkRegions() {
    let chunkRegions = {}

    let passableNeighborHits = this.getPassableNeighborHits()
    passableNeighborHits.forEach((hit) => {
      let chunkRegion = this.getContainer().getChunkRegionAt(hit.row, hit.col)
      if (chunkRegion) {
        chunkRegions[chunkRegion.getId()] = chunkRegion
      }
    })

    let wallChunkRegions = this.getContainer().getChunkRegionsAt(this.getRow(), this.getCol())
    for (let id in wallChunkRegions) {
      let chunkRegion = wallChunkRegions[id]
      chunkRegions[chunkRegion.getId()] = chunkRegion
    }

    return chunkRegions
  }

  isBlockingRoom(room) {
    let result = false

    for (let roomId in this.rooms) {
      let otherRoom = this.rooms[roomId]
      let isDifferentRoom = room.getId() !== otherRoom.getId()

      if (isDifferentRoom) {
        if (!otherRoom.hasDoorEnterableFromRoom(room)) {
          result = true
          break
        }
      }
    }

    return result
  }

  getTileNeighbors() {
    let row = this.getRow()
    let col = this.getCol()

    let neighbors = [
      { row: row    , col: col - 1},
      { row: row - 1, col: col    },
      { row: row    , col: col + 1},
      { row: row + 1, col: col    }
    ]

    return neighbors.map((coord) => {
      coord.entity = this.sector.pathFinder.getTile(coord.row, coord.col)
      return coord
    })
  }

  getPassableNeighborHits() {
    return this.getTileNeighbors().filter((tile) => {
      return tile.entity && !tile.entity.isPathFindBlocker()
    })
  }

  getNeighborAirtightHits() {
    let result = []

    let hits = this.getSideTiles(this.container.armorMap)
    hits.forEach((hit) => {
      if (hit.entity && hit.entity.isAirtight()) {
        result.push(hit)
      }
    })

    hits = this.getSideTiles(this.container.structureMap)
    hits.forEach((hit) => {
      if (hit.entity && hit.entity.isAirtight()) {
        result.push(hit)
      }
    })

    return result
  }

  isCollidable(entity) {
    if (entity) return entity.canDamageWalls()

    return true
  }

}

module.exports = BaseWall
