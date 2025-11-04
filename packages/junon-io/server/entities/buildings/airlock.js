const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const PressureSealer = require('../../../common/interfaces/pressure_sealer')
const BaseBuilding = require("./base_building")

class Airlock extends BaseBuilding {

  onBuildingPlaced() {
    super.onBuildingPlaced()

    // ordering is important . replace walls would assign pressurables which need to be initialized
    this.initPressureSealer()
    this.replaceWallsIfPresent()
  }

  getMaxHealth() {
    let maxHealth = super.getMaxHealth()
    if (this.level === 1) return maxHealth * 2
    return maxHealth
  }

  isLightBlocker() {
    return !this.isOpen //  only if closed
  }

  recalculateNearbyFov() {
    if (!this.sector.isFovMode()) return
    let hits = this.getDoorSidePlatformTiles()    
    this.game.forEachPlayer((player) => {
      player.recalculateFovIfHitPresent(hits)
    })
  }

  getUpgradeCost() {
    return 500
  }

  getUpperHinge() {
    let doorX = this.getX()
    let doorY = this.getY()
    let tileDistanceFromHinge = 1.5
    let x = doorX - Math.round(Math.cos(this.getRadAngle()) * Constants.tileSize * tileDistanceFromHinge)
    let y = doorY - Math.round(Math.sin(this.getRadAngle()) * Constants.tileSize * tileDistanceFromHinge)
    let row = Math.floor(y / Constants.tileSize)
    let col = Math.floor(x / Constants.tileSize)

    return {
      row: row,
      col: col,
      x: x,
      y: y,
      w: Constants.tileSize,
      h: Constants.tileSize
    }
  }

  isAutomatic() {
    return true
  }

  getLowerHinge() {
    let doorX = this.getX()
    let doorY = this.getY()
    let tileDistanceFromHinge = 1.5
    let x = doorX + Math.round(Math.cos(this.getRadAngle()) * Constants.tileSize * tileDistanceFromHinge)
    let y = doorY + Math.round(Math.sin(this.getRadAngle()) * Constants.tileSize * tileDistanceFromHinge)
    let row = Math.floor(y / Constants.tileSize)
    let col = Math.floor(x / Constants.tileSize)

    return {
      row: row,
      col: col,
      x: x,
      y: y,
      w: Constants.tileSize,
      h: Constants.tileSize
    }
  }

  static isPositionValid(container, x, y, w, h, angle, player) {
    let armorHits = container.armorMap.hitTestTile(this.prototype.getBox(x, y, w, h))
    const isEnemyArmor = armorHits.find((hit) => { return hit.entity && !hit.entity.isOwnedBy(player) })
    if (isEnemyArmor) return false



    //used armorhits.length > 2 to bypass container.structureMap.isOccupied. Need to fix this
    return  this.isOnValidPlatform(container, x, y, w, h, angle, player) &&
                             !this.isOnHangar(container, x, y, w, h) &&
                             !this.hasRailNeighbor(container, x, y, w, h) &&
                             !container.railMap.isOccupied(x, y, w, h) &&
                             !container.structureMap.isOccupied(x, y, w, h) //false is for ignoring walls, like we used to when they weren't classified as structures. 
  }

  interact(user) {
    if (user && user.isPlayer()) {
      if (!this.sector.isTutorial() && !this.isOwnedBy(user)) {
        return
      }
    }

    if (this.isOpen) {
      this.close()
    } else {
      this.open()
    }
  }

  onNetworkAssignmentChanged(networkCollection, network) {
  }

  unregister() {
    super.unregister()
  }

  getConnectedRooms() {
    if (!this.rooms) return []
    return Object.values(this.rooms)
  }

  openFor(duration) {
    this.open()

    clearTimeout(this.closeTimeout)
    this.closeTimeout = setTimeout(() => {
      this.close()
    }, duration)
  }

  getConstantsTable() {
    return "Buildings.Airlock"
  }

  getType() {
    return Protocol.definition().BuildingType.Airlock
  }

  getPlatformTiles(box) {
    let hits = []
    let grids = [this.container.platformMap]

    if (this.container.isSector()) {
      grids.push(this.container.groundMap)
    }

    for (var i = 0; i < grids.length; i++) {
      let grid = grids[i]
      hits = grid.hitTestTile(box)
      let containsHit = hits.find((hit) => { return hit.entity })
      if (containsHit) {
        break
      }
    }

    return hits
  }

  getDoorSidePlatformTiles() {
    let result = []

    // one side of door
    let hits = this.getPlatformTiles(this.getDoorSideRelativeBox(-1))
    result = result.concat(hits)

    // opposite side of door
    hits = this.getPlatformTiles(this.getDoorSideRelativeBox(1))
    result = result.concat(hits)

    return result
  }

  getVacuumTile() {
    return this.getVacuumTiles()[0]
  }

  canBeEnteredFromSpace() {
    let hits = this.getDoorSidePlatformTiles()

    let spaceTile = hits.find((hit) => {
      let noPlatform = hit.entity === 0
      if (noPlatform) return true
    })

    return spaceTile
  }

  getVacuumTiles(roomToCheck) {
    let hits = this.getDoorSidePlatformTiles()

    return hits.filter((hit) => {
      let noPlatform = hit.entity === 0
      if (noPlatform) return this.isOpen

      let room  = hit.entity.room
      if (room === roomToCheck && !room.isAirtight()) return true

      return false
    })
  }


  getDockingBoundingBox(w, h) {
    let box = this.getRelativeBox()
    let tile = this.getVacuumTile()
    if (!tile) return null

    const tileX = tile.col * Constants.tileSize + Constants.tileSize/2
    const tileY = tile.row * Constants.tileSize + Constants.tileSize/2
    let minX, maxX, minY, maxY

    if (tileX > (box.pos.x + box.w)) {
      // right side of door
      minX = tileX
      maxX = minX + w
      minY = tileY - h/2
      maxY = minY + h
    } else if (tileX < (box.pos.x)) {
      // left side of door
      minX = tileX - w
      maxX = tileX
      minY = tileY - h/2
      maxY = minY + h
    } else if (tileY < (box.pos.y)) {
      // top side of door
      minX = tileX - w/2
      maxX = minX + w
      minY = tileY - h
      maxY = tileY
    } else if (tileY > (box.pos.y + box.h)) {
      // lower side of door
      minX = tileX - w/2
      maxX = minX + w
      minY = tileY
      maxY = tileY + h
    }


    return {
      minX: minX,
      minY: minY,
      maxX: maxX,
      maxY: maxY
    }

  }

  getDoorLengthDivisor() {
    return 2
  }

  // side can be -1 or +1
  getDoorSideRelativeBox(side) {
    let doorLengthDivisor = this.getDoorLengthDivisor()
    let rotatedWidth  = Math.round(Math.abs(Math.cos(this.getRadOrigAngle())) * this.getWidth() / doorLengthDivisor + Math.abs(Math.sin(this.getRadOrigAngle()))  * this.getHeight())
    let rotatedHeight = Math.round(Math.abs(Math.cos(this.getRadOrigAngle())) * this.getHeight()                     + Math.abs(Math.sin(this.getRadOrigAngle())) * this.getWidth() / doorLengthDivisor)
    let deltaX = Math.round(Math.abs(Math.sin(this.getRadOrigAngle())) * Constants.tileSize * side)
    let deltaY = Math.round(Math.abs(Math.cos(this.getRadOrigAngle())) * Constants.tileSize * side)

    if (!this.container.isMovable()) {
      return this.getBox(this.getX() + deltaX, this.getY() + deltaY, rotatedWidth, rotatedHeight)
    } else {
      return this.getBox(this.getRelativeX() + deltaX, this.getRelativeY() + deltaY, rotatedWidth, rotatedHeight)
    }
  }

  isCollidable() {
    return !this.isOpen
  }

  shouldObstruct(body, hit) {
    if (this.isOpen) {
      // only on hinges
      let upperHinge = this.getUpperHinge()
      let lowerHinge = this.getLowerHinge()

      return (hit.row === upperHinge.row && hit.col === upperHinge.col) ||
             (hit.row === lowerHinge.row && hit.col === lowerHinge.col)
    } else {
      return true
    }
  }

  isHitPassable(hit) {
    let upperHinge = this.getUpperHinge()
    let lowerHinge = this.getLowerHinge()

    let isUpperLowerHinge = (hit.row === upperHinge.row && hit.col === upperHinge.col) ||
                            (hit.row === lowerHinge.row && hit.col === lowerHinge.col)

    return !isUpperLowerHinge
  }

  isAllowedToPass(entity) {
    return true
  }

}


Object.assign(Airlock.prototype, PressureSealer.prototype, {
  hasVacuum(room) {
    return this.getVacuumTiles(room).length > 0
  },
  onSealerStateChanged() {
    this.recalculateNearbyFov()
    this.onStateChanged("isOpen")
  }
})


module.exports = Airlock
