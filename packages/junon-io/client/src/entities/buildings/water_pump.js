const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const WaterPumpCommon = require("./../../../../common/entities/water_pump_common")
const LiquidPipe = require("./liquid_pipe")

class WaterPump extends BaseBuilding {

  static isOnValidPlatform(container, x, y, w, h, angle, player) {
    if (this.isPlacingOnSomeoneElsePlatform(container, x, y, w, h, angle, player)) return false

    let square = WaterPumpCommon.getSquare(x, y, angle)

    return container.platformMap.isFullyOccupied(square.x, square.y, square.w, square.h) ||
          (container.groundMap.isFullyOccupied(square.x, square.y, square.w, square.h) && !container.map.isOccupied(square.x, square.y, square.w, square.h))
  }


  static isPositionValid(container, x, y, w, h, angle, player) {
    let isBuildingValid = super.isPositionValid(container, x, y, w, h, angle, player)
    let extractor = WaterPumpCommon.getExtractor(x, y, angle)

    let hasLiquid = container.undergroundMap.isFullyOccupied(extractor.x, extractor.y, extractor.w, extractor.h)

    return isBuildingValid && hasLiquid
  }

  getRotatingTween() {
    let position = { position: 0 }

    return new TWEEN.Tween(position)
        .to({ position: 22 }, 200)
        .onUpdate(() => {
          this.rotatorSprites.forEach((rotatorSprite) => {
            rotatorSprite.position.x = position.position
          })
        })
        .repeat(Infinity)
  }

  cleanupTween() {
    if (this.tween) {
      this.tween.stop()
      this.tween = null
    }
  }

  remove() {
    super.remove()

    this.cleanupTween()
  }

  getSpritePath() {
    return 'water_pump.png'
  }

  getType() {
    return Protocol.definition().BuildingType.WaterPump
  }

  getConstantsTable() {
    return "Buildings.WaterPump"
  }

  getBaseSpritePath() {
    return this.getSpritePath()
  }

  getRotatorSpritePath() {
    return ''
  }

  getDisplayHeight() {
    return 92
  }

  getDisplayWidth() {
    return 57
  }

  getBuildingSprite() {
    this.rotatorSprites = this.rotatorSprites || []

    const sprite = new PIXI.Container()

    const baseSprite = new PIXI.Sprite(PIXI.utils.TextureCache[this.getBaseSpritePath()])
    baseSprite.anchor.set(0.5)
    baseSprite.width = this.getDisplayWidth()
    baseSprite.height = this.getDisplayHeight()
    this.baseSprite = baseSprite
    this.baseSprite.name = "BaseSprite"

    let rotator = new PIXI.Sprite(PIXI.utils.TextureCache[this.getRotatorSpritePath()])

    rotator.anchor.set(0.5)
    rotator.position.y = 68

    this.rotatorSprites.push(rotator)

    rotator = new PIXI.Sprite(PIXI.utils.TextureCache[this.getRotatorSpritePath()])

    rotator.anchor.set(0.5)
    rotator.position.y = -68

    this.rotatorSprites.push(rotator)

    sprite.addChild(baseSprite)

    this.rotatorSprites.forEach((rotatorSprite) => {
      sprite.addChild(rotatorSprite)
    })

    return sprite
  }

}

module.exports = WaterPump
