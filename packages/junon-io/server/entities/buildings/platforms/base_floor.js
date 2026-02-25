const BaseBuilding = require("./../base_building")
const Constants = require("../../../../common/constants.json")
const Protocol = require("../../../../common/util/protocol")

class BaseFloor extends BaseBuilding {

  static isDifferentPlatform(platformEntity, type, colorIndex, textureIndex, customHex) {
    if (platformEntity === 0) return true
    if (!platformEntity) return true
    if (platformEntity.getType() !== type) return true

    if (platformEntity.colorIndex !== colorIndex) return true
    if (platformEntity.textureIndex !== textureIndex) return true
    
    if (colorIndex === 999 && platformEntity.colorIndex === 999) {
      if (platformEntity.customHex === customHex) {
        return false
      }
      return true
    }

    return false
  }

  static isPositionValid(container, x, y, w, h, angle, player, type, colorIndex, textureIndex, customHex) {
    if (this.isPlacingOnSomeoneElsePlatform(container, x, y, w, h, angle, player)) return false

    let box = this.getBox(x, y, w, h)

    let isContainerSector = container.groundMap
    let isValidOnGlobalMap = true
    if (isContainerSector) {
      isValidOnGlobalMap = container.groundMap.hitTestTile(box).every((hit) => {
        let isNotObstacle = (hit.entity && !hit.entity.isObstacle())
        let isEmptySpace = !hit.entity
        return isNotObstacle || isEmptySpace
      })
    }


    let row = Math.floor(y / Constants.tileSize)
    let col = Math.floor(x / Constants.tileSize)
    let platformEntity = container.platformMap.get(row, col)
    let isDifferentPlatform = this.isDifferentPlatform(platformEntity, type, colorIndex, textureIndex, customHex)

    let isTrap = platformEntity && platformEntity.hasCategory("trap")

    let distributionEntity = container.distributionMap.get(row, col)
    let hasCrop = distributionEntity && distributionEntity.hasCategory("crop")

    return isDifferentPlatform &&
           !hasCrop &&
           !isTrap &&
           isValidOnGlobalMap
  }

  static isPlacingOnSomeoneElsePlatform(container, x, y, w, h, angle, player) {
    let box = this.getBox(x, y, w, h)

    return container.platformMap.hitTestTile(box).find((hit) => {
      if (!hit.entity) return false

      let buildOwner = player && player.getBuildOwner()
      return hit.entity.getOwner() && (hit.entity.getOwner() !== buildOwner)
    })

  }

  getMap() {
    return this.container.platformMap
  }

  getGroup() {
    return "platforms"
  }

  getMapName() {
    return "platformMap"
  }

  replaceExistingTiles() {
    let map = this.container[this.getMapName()]
    let entity = map.get(this.getRow(), this.getCol())
    if (entity ) {
      if (this.hasHigherPriorityThan(entity)) {
        entity.replace()
      } else {
        this.stopConstruction()
      }
    }
  }

  hasHigherPriorityThan(entity) {
    if (entity.hasCategory("trap")) return false

    return true
  }

  isCollidable() {
    return false
  }

  isMaxUpgradeReached() {
    return true
  }

}

module.exports = BaseFloor
