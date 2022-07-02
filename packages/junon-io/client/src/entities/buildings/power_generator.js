const SolarPanel = require("./solar_panel")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const Drainable = require("./../../../../common/interfaces/drainable")
const ClienHelper = require("./../../util/client_helper")

class PowerGenerator extends SolarPanel {

  static isOnValidPlatform(container, x, y, w, h, angle, player) {
    if (this.isPlacingOnSomeoneElsePlatform(container, x, y, w, h, angle, player)) return false

    return container.platformMap.isFullyOccupied(x, y, w, h) ||
          (container.groundMap.isFullyOccupied(x, y, w, h) && !container.map.isOccupied(x, y, w, h))
  }

  getSprite() {
    let sprite = super.getSprite()

    this.fillBarContainer.position.x = -36

    return sprite
  }


  onBuildingConstructed() {
    super.onBuildingConstructed()

    this.tween = this.getTween()
  }

  onUsageChanged() {
    super.onUsageChanged()

    if (this.getUsage() > 0) {
      if (!this.tween.isPlaying()) {
        this.tween.start()
      }
    } else {
      this.tween.stop()
    }
  }

  getTween() {
    let alpha = { alpha: 0 }

    const tween = new TWEEN.Tween(alpha)
        .to({ alpha: 1 }, 1000)
        .onUpdate(() => {
          this.coreSprite.alpha = alpha.alpha
        })
        .yoyo(true)
        .repeat(Infinity)

    return tween
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


  getBuildingSprite() {
    let container = new PIXI.Container()

    this.baseSprite = new PIXI.Sprite(PIXI.utils.TextureCache[this.getSpritePath()])
    this.baseSprite.anchor.set(0.5)

    container.addChild(this.baseSprite)

    this.coreSprite = new PIXI.Sprite(PIXI.utils.TextureCache["chemfuel_power_generator_core.png"])
    this.coreSprite.anchor.set(0.5)
    this.coreSprite.position.y = 2
    this.coreSprite.alpha = 0

    container.addChild(this.coreSprite)

    return container
  }



  getType() {
    return Protocol.definition().BuildingType.PowerGenerator
  }

  getSpritePath() {
    return "chemfuel_power_generator.png"
  }

  getConstantsTable() {
    return "Buildings.PowerGenerator"
  }

}

module.exports = PowerGenerator
