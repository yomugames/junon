const Grid = require("./../../common/entities/grid")
const Constants = require("./../../common/constants")
const p2 = require("p2")
const BaseTransientEntity = require("./../entities/base_transient_entity")
const Protocol = require("./../../common/util/protocol")
const Helper = require("../../common/helper")

class FlowField {

  /*
    target: { id: 4, row: 1, col: 2, type: 15 }
  */
  constructor(pathRouter, target, container, options = {}) {
    this.game = container.game

    this.id = container.game.generateId("flowfield")

    this.pathRouter = pathRouter

    this.target = target
    this.sourceEntity = target.entity
    this.container = container

    this.isPersistent = options.isPersistent
    this.shouldTrackGroundEdge = options.shouldTrackGroundEdge
    this.registerCallback = options.register

    this.options = Object.assign({}, options, { 
      sourceEntity: this.sourceEntity, 
      shouldCalculateDistance: true 
    })

    // leaks references to TileHits (which might be used by other sectors). 
    // so must delete
    delete this.options["additionalTargets"]

    this.isChunkRegionFlowField = options.isChunkRegionFlowField

    this.updateTimestamp = options.updateTimestamp || this.game.timestamp
    this.createTimestamp = this.game.timestamp

    this.land = options.land
    this.cacheDependents = {}

    this.initVariables()
  }

  getId() {
    return this.id
  }

  addCacheDependency(cacheKey) {
    this.cacheDependents[cacheKey] = true
  }

  removeCacheDependency(cacheKey) {
    delete this.cacheDependents[cacheKey] 
  }

  isRecentlyCreated() {
    let threeSeconds = Constants.physicsTimeStep * 3
    return this.game.timestamp - this.createTimestamp < threeSeconds
  }

  initVariables() {

    this.onPopulatedCallbacks = []
    this.edges = new Set()
    this.isConnectedToSky = false
    this.isPopulated = false

    this.DIRECTIONS = {
      NORTH:       [0,-1],
      NORTH_EAST:  [1,-1],
      EAST:        [1,0],
      SOUTH_EAST:  [1,1],
      SOUTH:       [0,1],
      SOUTH_WEST:  [-1,1],
      WEST:        [-1,0],
      NORTH_WEST:  [-1,-1],
      NONE:        [0,0]
    }

    this.constructor.initStaticVariables()
  }

  static initStaticVariables() {
    this.topLeftDirection = this.topLeftDirection || []
    this.topRightDirection = this.topRightDirection || []
    this.bottomLeftDirection = this.bottomLeftDirection || []
    this.bottomRightDirection = this.bottomRightDirection || []
    this.topDirection = this.topDirection || []
    this.bottomDirection = this.bottomDirection || []
    this.direction = this.direction || []
  }

  isInitialized() {
    return this.isPopulated
  }

  hasSkyEdge() {
    return this.isConnectedToSky
  }

  hasWaterEdge() {
    return this.isConnectedToWater
  }

  getGoal() {
    return this.sourceEntity
  }

  forEachCoord(cb) {
    for (let coord in this.distanceMap) {
      cb(coord)
    }
  }

  getEdges() {
    return this.edges
  }

  // descending order in distance
  getSortedCoords() {
    let coordList = Object.keys(this.distanceMap)

    return coordList.sort((coord, otherCoord) => {
      return this.distanceMap[otherCoord] - this.distanceMap[coord]
    })
  }

  isInactive() {
    let timestampDuration = this.game.timestamp - this.updateTimestamp
    let durationInSeconds = Math.floor(timestampDuration / Constants.physicsTimeStep)

    return durationInSeconds > 10 
  }

  reinit() {
    this.edges = new Set()
    this.distanceMap = {}
    this.directionMap = {}

    this.isChanged = true
    this.maxDistance = 0

    this.ROW_COUNT    = this.container.getRowCount()
    this.COLUMN_COUNT = this.container.getColCount()
  }

  getCoord(target) {
    return this.getCoordFromRowCol(target.row, target.col)
  }

  getCoordFromRowCol(row, col) {
    return row + "-" + col
  }

  getRowColFromCoord(coord) {
    return Helper.getRowColFromCoord(coord)
  }

  getDirection(row, col) {
    return this.directionMap[this.getCoordFromRowCol(row, col)] || [0,0]
  }

  getPassableDirectionNonEmpty(entity, row, col) {
    if (this.isCrossingCorner(entity.getRow(), entity.getCol(), row, col)) {
      return [0,0]
    }

    let direction = this.directionMap[this.getCoordFromRowCol(row, col)]
    if (!direction) return [0,0]

    if (!this.pathRouter.canPassEntity(entity, row, col)) {
      return [0,0]
    }

    return direction
  }

  getFlowNonEmpty(row, col) {
    return this.getFlow(row, col) || new Flow({ row: row, col: col })
  }

  getRandomCoordWithDistance(distance) {
    let coords = this.getCoordsWithDistance(distance)
    return coords[Math.floor(Math.random() * coords.length)]
  }

  getCoordsWithDistance(targetDistance) {
    let coords = []

    for (let coord in this.distanceMap) {
      let distance = this.distanceMap[coord]
      if (distance === targetDistance) {
        coords.push(coord)
      }
    }

    return coords
  }

  static scaleDirection(out, a, b) {
    out[0] = a[0] * b
    out[1] = a[1] * b
    return out
  }

  static addDirection(out, a, b) {
    out[0] = a[0] + b[0]
    out[1] = a[1] + b[1]
    return out
  }

  static normalizeDirection(out, a) {
    let x = a[0],
        y = a[1]

    let len = x*x + y*y
    if (len > 0) {
        len = 1 / Math.sqrt(len)
        out[0] = a[0] * len
        out[1] = a[1] * len
    }

    return out
  }

  getBilinearInterpolatedDirection(entity) {
    this.updateTimestamp = this.game.timestamp

    let topLeftRow = Math.floor((entity.getY() - (Constants.tileSize / 2)) / Constants.tileSize)
    let topLeftCol = Math.floor((entity.getX() - (Constants.tileSize / 2)) / Constants.tileSize)

    let directions = this.getPassableFourQuadrantDirections(entity, topLeftRow, topLeftCol)

    return this.constructor.interpolateDirections(entity, topLeftRow, topLeftCol, directions)
  }

  static interpolateDirections(entity, topLeftRow, topLeftCol, directions) {
    let topLeft     = directions[0]
    let bottomLeft  = directions[1]
    let topRight    = directions[2]
    let bottomRight = directions[3]

    let topLeftX = topLeftCol * Constants.tileSize
    let topLeftY = topLeftRow * Constants.tileSize

    let topLeftMidpointX = topLeftX + Constants.tileSize / 2
    let leftWeight = (Constants.tileSize - (entity.getX() - topLeftMidpointX)) / Constants.tileSize
    let rightWeight = (1 - leftWeight)

    let topLeftMidpointY =  topLeftY + Constants.tileSize / 2
    let topWeight = (Constants.tileSize - (entity.getY() - topLeftMidpointY)) / Constants.tileSize
    let bottomWeight = (1 - topWeight)

    this.scaleDirection(this.topLeftDirection, topLeft, leftWeight)
    this.scaleDirection(this.topRightDirection, topRight, rightWeight)
    this.scaleDirection(this.bottomLeftDirection, bottomLeft, leftWeight)
    this.scaleDirection(this.bottomRightDirection, bottomRight, rightWeight)

    // horizontal interpolations
    this.addDirection(this.topDirection, this.topLeftDirection, this.topRightDirection)
    this.addDirection(this.bottomDirection, this.bottomLeftDirection, this.bottomRightDirection)

    // vertical interpolations
    this.scaleDirection(this.topDirection, this.topDirection, topWeight)
    this.scaleDirection(this.bottomDirection, this.bottomDirection, bottomWeight)

    this.addDirection(this.direction, this.topDirection, this.bottomDirection)
    this.normalizeDirection(this.direction, this.direction)

    return this.direction
  }

  getPassableFourQuadrantDirections(entity, topLeftRow, topLeftCol) {
    let direction1 = this.getPassableDirectionNonEmpty(entity, topLeftRow    , topLeftCol)     // top-left
    let direction2 = this.getPassableDirectionNonEmpty(entity, topLeftRow + 1, topLeftCol)     // bottom-left
    let direction3 = this.getPassableDirectionNonEmpty(entity, topLeftRow    , topLeftCol + 1) // top-right
    let direction4 = this.getPassableDirectionNonEmpty(entity, topLeftRow + 1, topLeftCol + 1) // bottom-right

    return [direction1, direction2, direction3, direction4]
  }

  getMaxDistance() {
    return this.maxDistance
  }

  isSkyEdge(neighbors) {
    let hasSkyTileNeighbor = neighbors.find((neighbor) => {
      return neighbor.type === 0
    })

    return hasSkyTileNeighbor
  }

  isWaterEdge(neighbors) {
    let hasWaterTileNeighbor = neighbors.find((neighbor) => {
      return neighbor.type === Protocol.definition().TerrainType.Water
    })

    return hasWaterTileNeighbor
  }

  isGroundEdge(neighbors) {
    let hasNonGroundNeighbor = neighbors.find((neighbor) => {
      if (neighbor.type === 0) return true

      return neighbor.entity &&
             (neighbor.entity.isForegroundTile() || neighbor.entity.isUndergroundTile())
    })

    return hasNonGroundNeighbor
  }

  isPassable(hit, sourceEntity) {
    if (this.options.isLandAndSky) {
      if (!hit.entity) return true
    }

    // pure sky flowField, only allow empty tiles
    if (this.isSkyFlowField() && !this.options.isLandAndSky) {
      return !hit.entity
    }

    return this.pathRouter.isPassable(hit, sourceEntity)
  }

  populate() {
    this.reinit()
    this.createDistanceField(() => {
      this.createDirectionField()
      this.finish()
    })
  }

  populateSync() {
    this.reinit()
    this.createDistanceFieldSync()
    this.createDirectionField()
    this.finish()
  }

  finish() {
    // remove reference, we dont care about those data, save memory and
    // avoid references to old entities in future
    this.floodFillRequest = null

    this.isPopulated = true

    if (this.registerCallback) {
      this.registerCallback(this)
    }

    if (!this.isChunkRegionFlowField) {
      this.pathRouter.registerFlowField(this.sourceEntity, this)
    }

    if (this.land) {
      this.land.registerFlowField(this)
    }

    this.emitOnPopulated()
  }

  emitOnPopulated() {
    this.onPopulatedCallbacks.forEach((callback) => {
      callback()
    })

    this.onPopulatedCallbacks = []
  }

  cancel() {
    this.reinit()
    this.floodFillRequest.cancel()
    this.floodFillRequest = null
  }

  onPopulated(callback) {
    this.onPopulatedCallbacks.push(callback)
  }

  createDistanceField(callback) {
    this.floodFillRequest = this.pathRouter.requestFloodFill(this.target.row, this.target.col, this.options)
    this.floodFillRequest.onUpdate(this.onFloodFillTileFound.bind(this))

    this.floodFillRequest.onComplete(() => {
      callback()
    })
  }

  isSkyFlowField() {
    return !this.hasGround
  }

  onFloodFillTileFound(visitedHit, neighbors) {
    if (visitedHit.entity) {
      this.hasGround = true
    }

    if (this.shouldTrackGroundEdge) {
      if (this.isGroundEdge(neighbors)) {
        let coord = this.getCoord(visitedHit)
        this.edges.add(coord)

        if (this.isSkyEdge(neighbors)) {
          this.isConnectedToSky = true
        }

        if (this.isWaterEdge(neighbors)) {
          this.isConnectedToWater = true
        }
      }
    }

    this.maxDistance = visitedHit.distance
    this.registerDistance(this.getCoord(visitedHit), visitedHit.distance)
  }

  createDistanceFieldSync(callback) {
    this.pathRouter.floodFill(this.target.row, this.target.col, this.options, this.onFloodFillTileFound.bind(this))
  }

  registerDistance(coord, distance) {
    this.distanceMap[coord] = distance
  }

  registerDirection(coord, direction) {
    this.directionMap[coord] = direction
  }

  createDirectionField() {
    for (let coord in this.distanceMap) {
      let distance = this.distanceMap[coord]
      let rowCol = this.getRowColFromCoord(coord)
      let row = rowCol[0]
      let col = rowCol[1]

      let direction = this.calculateFlowDirection(row, col)
      this.registerDirection(coord, direction)
    }
  }

  calculateFlowDirection(row, col) {
    let shortestRouteRowCol
    let maxStep = 0

    this.forEachEightGridNeighbors(row, col, (neighborRow, neighborCol) => {
      let distance = this.distanceMap[this.getCoordFromRowCol(row, col)]
      let neighborDistance = this.distanceMap[this.getCoordFromRowCol(neighborRow, neighborCol)]
      let step = distance - neighborDistance
      if (step > maxStep) {
        shortestRouteRowCol = [neighborRow, neighborCol]
        maxStep = step
      } else if (step > 0 && step === maxStep) {
        // prefer horizontal vertical movements
        if ((row - neighborRow) === 0 || (col - neighborCol) === 0) {
          shortestRouteRowCol = [neighborRow, neighborCol]
        } 
      }
    })


    if (shortestRouteRowCol) {
      return this.getFlowDirection(row, col, shortestRouteRowCol[0], shortestRouteRowCol[1])
    } else {
      return this.DIRECTIONS.NONE
    }
  }

  isCrossingCorner(row, col, otherRow, otherCol, sourceEntity) {
    let isDiagonal = Math.abs(row - otherRow) === 1 && Math.abs(col - otherCol) === 1
    if (!isDiagonal) return false

    let rowIncrement = otherRow - row
    let colIncrement = otherCol - col

    let horizontalCornerHit = this.getTileHit(row               , col + colIncrement)
    let verticalCornerHit   = this.getTileHit(row + rowIncrement, col               )

    if (!horizontalCornerHit || !verticalCornerHit) return true

    let result = !this.isPassable(horizontalCornerHit, sourceEntity) ||
                 !this.isPassable(verticalCornerHit,   sourceEntity)

    horizontalCornerHit.remove()
    verticalCornerHit.remove()

    return result
  }

  // returns a vector instead of angles (to allow summation)
  getFlowDirection(sourceRow, sourceCol, destinationRow, destinationCol) {
    let xDirection = destinationCol - sourceCol
    let yDirection = destinationRow - sourceRow
    let directionConstant = this.getDirectionConstantByXY(xDirection, yDirection)

    return this.DIRECTIONS[directionConstant]
  }

  getDirectionConstantByXY(xDirection, yDirection) {
    if (!this.XY_TO_DIRECTION) {
      this.XY_TO_DIRECTION = {}
      for (let key in this.DIRECTIONS) {
        let direction = this.DIRECTIONS[key]
        let xy = direction.join("-")
        this.XY_TO_DIRECTION[xy] = key
      }
    }

    let xy = [xDirection,yDirection].join("-")

    return this.XY_TO_DIRECTION[xy]
  }

  remove(options = {}) {
    for (let cacheKey in this.cacheDependents) {
      if (this.pathRouter.flowFieldCache[cacheKey]) {
        delete this.pathRouter.flowFieldCache[cacheKey]
      }
    }

    this.cacheDependents = {}

    if (this.isPersistent && !options.isForceRemove) return
    this.pathRouter.unregisterFlowField(this)

    if (this.land) {
      this.land.unregisterFlowField(this)
    }
  }

  forEachEightGridNeighbors(row, col, cb) {
    let positions = [
      [row - 1, col    ],      // up
      [row - 1, col - 1],      // up+left
      [row    , col - 1],      // left
      [row + 1, col - 1],      // left+down
      [row + 1, col    ],      // down
      [row + 1, col + 1],      // down+right
      [row    , col + 1],      // right
      [row - 1, col + 1]       // right+up
    ]

    for (let i = 0; i < positions.length; i++) {
      let position = positions[i]
      let neighborRow = position[0]
      let neighborCol = position[1]

      if (!this.isCrossingCorner(row, col, neighborRow, neighborCol, this.sourceEntity)) {
        cb(neighborRow, neighborCol)
      }
    }
  }

  hasFlow(row, col) {
    return this.isTargetReachableFrom(row, col)   
  }

  isTargetReachableFrom(row, col) {
    let coord = this.getCoordFromRowCol(row, col)
    return typeof this.distanceMap[coord] !== 'undefined'
  }

  isTargetReachableFromCoord(coord) {
    return !!this.distanceMap[coord]
  }

  getTileHit(row, col) {
    return this.pathRouter.getTileHit(row, col)
  }

  toJson() {
    let flows = {}

    for (let coord in this.distanceMap) {
      let rowCol = this.getRowColFromCoord(coord)

      flows[coord] = {
        row: rowCol[0],
        col: rowCol[1],
        distance: this.distanceMap[coord]
      }
    }

    for (let coord in this.directionMap) {
      flows[coord]["direction"] = {
          x: this.directionMap[coord][0],
          y: this.directionMap[coord][1]
      }
    }

    let locations = Object.values(flows)

    return {
      id: this.getId(),
      isChanged: this.isChanged,
      goal: { row: this.target.row, col: this.target.col },
      locations: locations
    }
  }
}

module.exports = FlowField

