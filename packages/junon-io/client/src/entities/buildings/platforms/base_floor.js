const BaseBuilding = require("./../base_building")
const Constants = require("./../../../../../common/constants.json")
const SocketUtil = require("./../../../util/socket_util")
const SpritePoolInstance = require("../../sprite_pool_instance")
const Protocol = require("./../../../../../common/util/protocol")

class BaseFloor extends BaseBuilding {

  constructor(game, data) {
    super(game, data)

  }

  static isPlacingOnSomeoneElsePlatform(container, x, y, w, h, angle, player) {
    let box = this.getBox(x, y, w, h)

    return container.platformMap.hitTestTile(box).find((hit) => {
      if (!hit.entity) return false

      let placerOwnerId = player && player.getBuildOwnerId()
      return hit.entity.owner && (hit.entity.owner.id !== placerOwnerId)
    })
  }

  // createSprite(texture) {
  //   this.spritePoolInstance = SpritePoolInstance.create({ texture: texture })
  //   return this.spritePoolInstance.sprite
  // }

  onClick(event) {
    super.onClick(event)

    if (this.game.isAdminMode) {
      this.handleDoubleClick(() => {
        SocketUtil.emit("DebugRoom", { id: this.id })
      })
    }
  }

  getBrightness() {
    return 20
  }

  static isDifferentPlatform(platformEntity, type, currentBuilding) {
    if (platformEntity === 0) return true
    if (!platformEntity) return true
    if (platformEntity.getType() !== type) return true
    // if (!currentBuilding) return true
    
    if (currentBuilding) {
      if (platformEntity.colorIndex !== currentBuilding.colorIndex) return true
      if (platformEntity.textureIndex !== currentBuilding.textureIndex) return true
      
      if (platformEntity.colorIndex === 999 && currentBuilding.colorIndex === 999) {
        if (platformEntity.customHex === currentBuilding.customHex) {
          return false
        }
        return true
      }
    }

    return false
  }

  static isPositionValid(container, x, y, w, h, angle, player, type, currentBuilding) {
    if (!this.isWithinInteractDistance(x, y, player)) return false
    if (this.isPlacingOnSomeoneElsePlatform(container, x, y, w, h, angle, player)) return false

    let isValidOnGlobalMap = container.map ? !container.map.isOccupied(x, y, w, h) : true
    let row = Math.floor(y / Constants.tileSize)
    let col = Math.floor(x / Constants.tileSize)
    let platformEntity = container.platformMap.get(row, col)
    let isDifferentPlatform = this.isDifferentPlatform(platformEntity, type, currentBuilding)
                              
    let isTrap = platformEntity && platformEntity.hasCategory("trap")
    

    let distributionEntity = container.distributionMap.get(row, col)
    let hasCrop = distributionEntity && distributionEntity.hasCategory("crop")

    return isDifferentPlatform &&
           !hasCrop &&
           !isTrap &&
           isValidOnGlobalMap
  }

  postBuildingConstructed() {
    super.postBuildingConstructed()
    let underground = this.sector.undergroundMap.get(this.getRow(), this.getCol())
    if (underground && underground.hasCategory("lava")) {
      underground.onCovered()
    }
  }

  static getGroup() {
    return "platforms"
  }

  getMap() {
    return this.container.platformMap
  }

  isMaxUpgradeReached() {
    return true
  }

  getSideHitTileMaps() {
    return []
  }

  getGroup() {
    return "platforms"
  }

  redrawSprite() {


    super.redrawSprite()
  }

  remove() {
    super.remove()

    // this.spritePoolInstance.remove()

    let underground = this.sector.undergroundMap.get(this.getRow(), this.getCol())
    if (underground && underground.hasCategory("lava")) {
      underground.onUncovered()
    }
  }

  getEdgeSpritePath() {
    return 'platform_edge.png'
  }

  getEdgePadding() {
    return 1
  }

  hasEdgeSprite() {
    return false
  }

  redrawNeighborTiles() {
    // if (this.hasCategory("platform")) return

    super.redrawNeighborTiles()
  }

  getDefaultRotation() {
    return 0
  }

  rotateEquip() {
    // dont allow rotation
  }

  getSpritePath() {
    return this.getBaseSpritePath()
  }

  getBaseSpritePath() {
    let table = this.getConstants()
    if (table.sprite && table.sprite.path) {
      return table.sprite.path + ".png"
    }

    throw "must implement getBaseSpritePath"
  }

  applyTint(tint) {
    this.baseSprite.tint = tint
  }

  getDisplayWidth() {
    return Constants.tileSize
  }

  getDisplayHeight() {
    return Constants.tileSize
  }

  getRotatedWidth() {
    return Constants.tileSize
  }

  getRotatedHeight() {
    return Constants.tileSize
  }

  getBuildingSprite() {
    let baseSpritePath = this.getBaseSpritePath()
    this.baseSprite     = this.createSprite(PIXI.utils.TextureCache[baseSpritePath])
    this.baseSprite.anchor.set(0.5)
    this.baseSprite.name = "FloorBaseSprite"
    if (this.data.hasOwnProperty("colorIndex")) {
      let color = this.game.colors[this.data.colorIndex]
      this.baseSprite.tint = color.value
    }

    return this.baseSprite
  }

}

module.exports = BaseFloor
