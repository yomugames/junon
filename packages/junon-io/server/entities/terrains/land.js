const Helper = require("../../../common/helper")

class Land {
  constructor(sector, originEntity) {
    // roomManager indexes room and land together so they should be unique
    this.id = sector.game.generateEntityId()

    this.sector = sector
    this.game = sector.game
    this.tiles = new Set()
    this.edges = new Set()

    this.flowField = null // the flowField use to detect land region

    this.isPopulated = false
    this.originEntity = originEntity

    this.detectTiles()
  }

  remove() {
    if (this.flowField) {
      this.flowField.remove({ isForceRemove: true })
    }
  }

  getId() {
    return this.id
  }

  isInitialized() {
    return this.isPopulated
  }

  onInitialized(callback) {
    this.onInitializedCallback = callback
  }

  getRandomCoord() {
    let coordList = Array.from(this.tiles)
    let randomIndex = Math.floor(Math.random() * coordList.length)
    let randomCoord = coordList[randomIndex]
    return randomCoord
  }

  getUnoccupiedTiles(cb) {
    let grids = this.getOccupancyGrids()

    let coordIterator = this.tiles.values()

    let tileCount = this.tiles.size
    let i = 0

    while (i < tileCount) {
      i += 1

      let iteration = coordIterator.next()
      if (iteration.done) {
        break
      }

      let coord = iteration.value
      let rowCol = Helper.getRowColFromCoord(coord)

      if (!this.isOccupied(grids, rowCol[0], rowCol[1])) {
        let shouldContinue = cb(coord)
        if (!shouldContinue) {
          break
        }
      }
    }
  }

  isSuitableForLanding() {
    return this.getOccupancyRate() < 0.15 && this.getTileCount() > 40
  }

  getTileCount() {
    return this.tiles.size
  }

  getOccupancyRate() {
    let count = 0
    this.getUnoccupiedTiles((coord) => {
      count += 1
      let shouldContinue = true
      return shouldContinue
    })

    let totalLandTileCount = this.tiles.size

    return (totalLandTileCount - count) / totalLandTileCount
  }

  isOccupied(grids, row, col) {
    let isOccupied = false

    for (var i = 0; i < grids.length; i++) {
      let grid = grids[i]
      let entity  = grid.get(row, col)
      if (entity) {
        isOccupied = true
        break
      }
    }

    return isOccupied
  }

  getOccupancyGrids() {
    return [this.sector.distributionMap,
            this.sector.gasDistributionMap,
            this.sector.fuelDistributionMap,
            this.sector.liquidDistributionMap,
            this.sector.structureMap,
            this.sector.armorMap,
            this.sector.platformMap]
  }

  addTiles() {
    this.flowField.forEachCoord((coord) => {
      this.tiles.add(coord)
    })

    this.flowField.getEdges().forEach((coord) => {
      this.edges.add(coord)
    })
  }

  getEdges() {
    return this.edges
  }

  getTileKey(row, col) {
    return row + "-" + col
  }

  hasTile(row, col) {
    let tileKey = this.getTileKey(row, col)
    return this.tiles.has(tileKey)
  }

  getFurthestCoordFrom(entity) {
    let coords = Array.from(this.edges)
    if (coords.length === 0) return null

    let furthestCoord = coords.sort((a, b) => {
      // descending order
      let aRowCol = Helper.getRowColFromCoord(a)
      let bRowCol = Helper.getRowColFromCoord(b)
      let aX = aRowCol[1] * Constants.tileSize + Constants.tileSize / 2
      let aY = aRowCol[0] * Constants.tileSize + Constants.tileSize / 2
      let bX = bRowCol[1] * Constants.tileSize + Constants.tileSize / 2
      let bY = bRowCol[0] * Constants.tileSize + Constants.tileSize / 2

      let distanceA =  this.game.distance(entity.getX(), entity.getY(), aX, aY)
      let distanceB =  this.game.distance(entity.getX(), entity.getY(), bX, bY)
      return distanceB - distanceA
    })[0]

    return furthestCoord
  }

  hasSkyEdge() {
    if (!this.flowField) return false
    return this.flowField.hasSkyEdge()
  }

  hasWaterEdge() {
    if (!this.flowField) return false
    return this.flowField.hasWaterEdge()
  }

  detectTiles() {
    this.createFlowField()

    this.postInit()
  }

  postInit() {
    this.isPopulated = true
    this.addTiles()

    if (this.onInitializedCallback) {
      this.onInitializedCallback()
    }
  }

  registerFlowField(flowField) {
    this.flowField = flowField
  }

  unregisterFlowField(flowField) {
    this.flowField = null
  }

  createFlowField(callback) {
    // 1st flowfield
    let entity = this.originEntity

    let options = {
      isPersistent: true,
      shouldTrackGroundEdge: true,
      land: this
    }

    let target = { row: entity.row, col: entity.col, entity: entity }
    this.flowField = this.sector.pathFinder.requestFlowFieldSync(target, options)
  }

}

module.exports = Land
