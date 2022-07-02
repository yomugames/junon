const Constants = require("../constants.json")
const vec2 = require("./../util/vec2")
const Grid = require("./../entities/grid")

const Container = () => {
}

Container.prototype = {
  initGrids() {
    this.regions = {}
    this.platforms = {}
    this.platformMap = new Grid("platform", this, this.getRowCount(), this.getColCount())

    this.distributions = {}
    this.distributionMap = new Grid("distribution", this, this.getRowCount(), this.getColCount())
    this.liquidDistributionMap = new Grid("liquidDistribution", this, this.getRowCount(), this.getColCount())
    this.gasDistributionMap    = new Grid("gasDistribution", this, this.getRowCount(), this.getColCount())
    this.fuelDistributionMap   = new Grid("fuelDistribution", this, this.getRowCount(), this.getColCount())

    this.armors = {}
    this.armorMap = new Grid("wall", this, this.getRowCount(), this.getColCount())

    this.structures = {}
    this.structureMap = new Grid("structure", this, this.getRowCount(), this.getColCount())

    this.railMap = new Grid("rail", this, this.getRowCount(), this.getColCount())

    this.rooms = {}
    this.roomTileMap = new Grid("room", this, this.getRowCount(), this.getColCount())

    this.units = {}
    this.unitMap = new Grid("unit", this, this.getRowCount(), this.getColCount())

    this.towers = {}
    this.flames = {}
    this.crops = {}
    this.processors = {}
    this.pickups = {}
    this.paths = {}
    this.breakings = {}
    this.corpses = {}
  },

  removeBuildings(box) {
    [this.platformMap, this.armorMap, this.structureMap, this.distributionMap, this.liquidDistributionMap, this.fuelDistributionMap, this.gasDistributionMap].forEach((map) => {
      let hits = map.hitTestTile(box)
      hits.forEach((hit) => {
        if (hit.entity) {
          hit.entity.remove()
        }
      })
    })
  },

  addBreaking(entity) {
    this.breakings[entity.id] = entity
  },

  removeBreaking(entity) {
    delete this.breakings[entity.id] 
  },

  getCollidableGrids() {
    throw new Error("must implement Container#getCollidableGrids")
  },

  getRaycastObstacles(sourceX, sourceY, targetX, targetY, maxLength, entityToIgnore) {
    let obstacles = []

    this.getCollidableGrids().forEach((grid) => {
      let raycasts = grid.raycast(sourceX, sourceY, targetX, targetY, maxLength, entityToIgnore)
      let blockingRaycasts = raycasts.filter((raycast) => {
        if (raycast.entity.isBuilding()) {
          return raycast.entity.isPathFindBlocker()
        } else {
          return true
        }
      })
      obstacles = obstacles.concat(blockingRaycasts)
    })

    return obstacles
  },

  raycast(sourceX, sourceY, targetX, targetY, maxLength, entityToIgnore) {
    let obstacles = this.getRaycastObstacles(sourceX, sourceY, targetX, targetY, maxLength, entityToIgnore)

    let nearestObstacle = null
    let nearestDistance = 100000 // very high num
    obstacles.forEach((obstacle) => {
      if (obstacle.distance < nearestDistance) {
        nearestDistance = obstacle.distance
        nearestObstacle = obstacle
      }
    })

    return nearestObstacle
  },

  removeExisting(map, box) {
    let hits = map.hitTestTile(box)
    hits.forEach((hit) => {
      if (hit.entity) hit.entity.remove()
    })
  },

  testBoxPoint(x1, y1, w1, h1, x2, y2) {
    return x2 >= x1 && x2 <= x1 + w1 && y2 >= y1 && y2 <= y1 + h1
  },

  addCrop(entity) {
    this.crops[entity.id] = entity
  },

  addProcessor(entity) {
    this.processors[entity.id] = entity
  },

  removeProcessor(entity) {
    delete this.processors[entity.id]
  },

  registerComponent(collectionName, mapName, entity) {
    const box = entity.getRelativeBox()
    this.removeExisting(this[mapName], box)

    this[mapName].register(box, entity)
    this[collectionName][entity.id] = entity

    this.onComponentAdded(entity)
  },

  unregisterComponent(collectionName, mapName, entity) {
    this[mapName].unregister(entity.getRelativeBox())
    delete this[collectionName][entity.id]

    if (entity.hasOwner()) {
      entity.getOwner().unregisterOwnership(collectionName, entity)
    }

    this.onComponentRemoved(entity)
  },

  onComponentAdded(entity) {
    // callback
  },

  onComponentRemoved(entity) {
    // callback
  },

  addPickup(pickup) {
    this.pickups[pickup.id] = pickup
  },

  removePickup(pickup) {
    delete this.pickups[pickup.id]
  },

  getPathFindableGrids() {
    return [this.structureMap, this.armorMap, this.platformMap]
  },

  getPathFindingGrid() {
    let grids = this.getPathFindableGrids().map((grid) => {
      return grid.getNumberGrid()
    })

    let rowCount = this.getRowCount()
    let colCount = this.getColCount()

    let grid = []

    for (let row = 0; row < rowCount; row++) {
      let rowGrid = []

      for (let col = 0; col < colCount; col++) {
        let tileType = grids[grids.length - 1][row][col] // default to last grid unless layer above exist

        for (var i = 0; i < grids.length; i++) {
          let grid = grids[i]
          tileType = grid[row][col]
          if (tileType) {
            break
          }
        }

        rowGrid.push(tileType)
      }

      grid.push(rowGrid)
    }

    return grid
  },

  getGridCoord(x, y) {
    const gridTopLeft = this.getGridRulerTopLeft()
    const relativeX = x - gridTopLeft.x
    const relativeY = y - gridTopLeft.y

    return {
      x: relativeX,
      y: relativeY
    }
  },


  getGridWidth() {
    return this.getColCount() * Constants.tileSize
  },

  getGridHeight() {
    return this.getRowCount() * Constants.tileSize
  },

  getGridRulerTopLeft() {
    const gridTopLeft  = {
      x: this.getX() - this.getGridWidth() / 2,
      y: this.getY() - this.getGridHeight() / 2
    }

    return gridTopLeft
  },

  getSnappedPosX(x, width) {
    const gridTopLeft = this.getGridRulerTopLeft()
    const objectSize = width
    const offset = ((objectSize / Constants.tileSize) - 1) * (Constants.tileSize / 2)

    const relativeMouseX = x - gridTopLeft.x
    const col = Math.floor((relativeMouseX + offset) / Constants.tileSize)
    const relativeX = col * Constants.tileSize + (Constants.tileSize / 2) - offset

    return relativeX
  },

  getSnappedPosY(y, height) {
    const gridTopLeft = this.getGridRulerTopLeft()
    const objectSize = height
    const offset = ((objectSize / Constants.tileSize) - 1) * (Constants.tileSize / 2)

    const relativeMouseY = y - gridTopLeft.y
    const row = Math.floor((relativeMouseY + offset) / Constants.tileSize)
    const relativeY = row * Constants.tileSize + (Constants.tileSize / 2) - offset

    return relativeY
  },

  isOutOfBounds(row, col) {
    return row < 0 || row >= this.getRowCount() ||
           col < 0 || col >= this.getColCount()
  }


}

module.exports = Container


