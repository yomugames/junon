const Constants = require("./../../common/constants")
const Helper = require("../../common/helper")

class PositionSearchRequest {
  constructor(sector, options = {}) {
    this.sector = sector
    this.options = options
    this.MAX_ATTEMPTS = 100
    this.attempt = 0
    this.landIndex = 0
  }

  getX() {
    return this.col * Constants.tileSize + Constants.tileSize/2
  }

  getY() {
    return this.row * Constants.tileSize + Constants.tileSize/2
  }

  onComplete(callback) {
    this.onCompleteCallback = callback
  }

  onLandFound() {
    if (this.onCompleteCallback) {
      this.onCompleteCallback(this.getX(), this.getY())
    }
  }

  isPositionValid(land) {
    if (!land.hasSkyEdge()) return false
    let chunkRegion = this.sector.getChunkRegionAt(this.row, this.col)
    if (!chunkRegion) return false // not in a ground/platform
    if (chunkRegion.hasPlayerStructures()) return false

    let ground             = this.sector.groundMap.get(this.row, this.col)
    let groundForEscapePod = this.sector.groundMap.get(this.row, this.col + 2)
    let groundForEscapePodTwo = this.sector.groundMap.get(this.row - 1, this.col + 2)
    let armor              = this.sector.armorMap.get(this.row, this.col + 2)
    let armorForEscapePod  = this.sector.armorMap.get(this.row, this.col + 2)
    let structure             = this.sector.structureMap.get(this.row, this.col + 2)
    let structureForEscapePod = this.sector.structureMap.get(this.row, this.col + 2)

    let tile = this.sector.roomManager.getTile(this.row, this.col)
    if (tile && tile.room && tile.room.isAirtight()) return false

    let isOnGroundAndNotObstacle = ground && 
                                     ground.isGroundTile() && 
                                     groundForEscapePod && 
                                     groundForEscapePod.isGroundTile() &&
                                     groundForEscapePodTwo && 
                                     groundForEscapePodTwo.isGroundTile() &&
                                     !armor &&
                                     !armorForEscapePod &&
                                     !structure &&
                                     !structureForEscapePod

    return isOnGroundAndNotObstacle      
  }

  search(lands) {
    this.attempt += 1

    if (this.attempt % 10 === 0) {
      this.landIndex += 1
    }

    let land = lands[this.landIndex]

    if (this.options.row) {
      this.row = this.options.row
      this.col = this.options.col
    } else if (land) {
      let coord = land.getRandomCoord()
      let rowCol = Helper.getRowColFromCoord(coord)
      this.row = rowCol[0]
      this.col = rowCol[1]
    } else if (!this.row) {
      this.row = this.sector.getRandomRow({ padding: 10 })
      this.col = this.sector.getRandomCol({ padding: 10 })
    }

    if ((this.attempt >= this.MAX_ATTEMPTS) || !land) {
      this.onLandFound()
      return
    }

    if (this.isPositionValid(land)) {
      this.onLandFound()
    } else {
      this.search(lands)
    }
  }

  checkIfLandHasSkyEdge(land) {
    if (land.hasSkyEdge()) {
    } else {
      this.search(land)
    }
  }

}

module.exports = PositionSearchRequest