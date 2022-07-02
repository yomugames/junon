const SocketUtil = require("./../util/socket_util")
const Constants = require("./../../../common/constants.json")


class RegionManager {
  constructor(game) {
    this.game = game
    this.sector = game.sector
  }

  startRegionSelect() {
    this.isSelectingRegion = true
    this.sector.regionAreaSprite.alpha = 0.6
    this.sector.regionAreaSprite.width = Constants.tileSize
    this.sector.regionAreaSprite.height = Constants.tileSize
  }

  setRegionStart() {
    this.regionStart = {
      x: this.sector.regionAreaSprite.x,
      y: this.sector.regionAreaSprite.y
    }
  }

  clearRegion() {
    this.isSelectingRegion = false
    this.regionStart = null
    this.regionEnd = null

    if (this.sector) {
      this.sector.regionAreaSprite.alpha  = 0
      this.sector.regionAreaSprite.width  = Constants.tileSize
      this.sector.regionAreaSprite.height = Constants.tileSize
    }
  }

  setRegionEnd(x, y) {
    this.regionEnd = {
      x: x,
      y: y
    }
  }
  
  renderRegionBlockAtMousePosition(clientX, clientY) {
    const cameraPositionX = -this.game.cameraDisplacement.x
    const cameraPositionY = -this.game.cameraDisplacement.y
    const x = cameraPositionX + clientX
    const y = cameraPositionY + clientY
    const snappedX = this.sector.getSnappedPosX(x, Constants.tileSize)
    const snappedY = this.sector.getSnappedPosY(y, Constants.tileSize)

    if (!this.regionStart) {
      this.sector.regionAreaSprite.x = snappedX
      this.sector.regionAreaSprite.y = snappedY
    } else {
      let endX = snappedX
      let endY = snappedY

      this.setRegionEnd(endX, endY)

      this.renderRegion(this.regionStart.x, this.regionStart.y, this.regionEnd.x, this.regionEnd.y)
    }

  }

  renderRegion(x1, y1, x2, y2) {
    let midpoint = {
      x: Math.max(x1, (x2 + x1) / 2),
      y: Math.max(y1, (y2 + y1) / 2)
    }

    let width  = Math.max(0, x2 - x1 + Constants.tileSize)
    let height = Math.max(0, y2 - y1 + Constants.tileSize)

    this.sector.regionAreaSprite.x = midpoint.x
    this.sector.regionAreaSprite.y = midpoint.y
    this.sector.regionAreaSprite.width = width
    this.sector.regionAreaSprite.height = height
  }

  createRegion() {
    const width = this.regionEnd.x - this.regionStart.x
    const height = this.regionEnd.y - this.regionStart.y
    const area = width * height
    const isRegionValid = area > 0 && width > 0 && height > 0

    if (isRegionValid) {
      this.onRegionCreated(this.regionStart, this.regionEnd)
    }

    this.clearRegion()
  }

  showHangarRegion(x1, x2, y1, y2) {
    this.sector.regionAreaSprite.alpha = 0.6
    this.renderRegion(x1, x2, y1, y2)
  }

  onRegionCreated(regionStart, regionEnd) {
    let midpoint = {
      x: (regionEnd.x + regionStart.x) / 2,
      y: (regionEnd.y + regionStart.y) / 2
    }

    const w = regionEnd.x - regionStart.x + Constants.tileSize
    const h = regionEnd.y - regionStart.y + Constants.tileSize

    let hangarControllerId = this.game.selectedEntity.id

    SocketUtil.emit("SetHangar", {
      id: hangarControllerId,
      x: midpoint.x,
      y: midpoint.y,
      w: w,
      h: h
    })
  }

  cleanup() {
    this.clearRegion()
  }



}

module.exports = RegionManager