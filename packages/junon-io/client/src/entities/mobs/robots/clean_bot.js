const BaseRobot = require('./base_robot')
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class CleanBot extends BaseRobot {
  constructor(game, data) {
    super(game, data)
  }

  getLightTween() {
    let alpha = { alpha: 0 }

    const tween = new TWEEN.Tween(alpha)
        .to({ alpha: 1 }, 500)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
          this.lightRing.alpha = alpha.alpha
        })
        .repeat(Infinity)
        .yoyo(true)

    return tween
  }

  onBehaviorChanged() {
    if (this.behavior === Protocol.definition().BehaviorType.Clean) {
      if (!this.tween) {
        this.tween = this.getLightTween()
      }

      this.tween.start()
    } else {
      this.lightRing.alpha = 0
      
      if (this.tween) {
        this.tween.stop()
      }

      this.tween = null
    }
  }

  isInteractable() {
    return true
  }

  getSpritePath() {
    return "clean_bot_2.png"
  }

  getType() {
    return Protocol.definition().MobType.CleanBot
  }

  getConstantsTable() {
    return "Mobs.CleanBot"
  }

  getCharacterSprite() {
    const sprite = new PIXI.Container()
    sprite.name = "Character"
    sprite.pivot.x = this.getWidth() / 2
    sprite.pivot.y = this.getWidth() / 2

    this.body   = new PIXI.Sprite(PIXI.utils.TextureCache["clean_bot_base.png"])
    this.body.name = "Body"
    this.body.anchor.set(0.1)

    this.lightRing   = new PIXI.Sprite(PIXI.utils.TextureCache["clean_bot_light.png"])
    this.lightRing.name = "LightRing"
    this.lightRing.anchor.set(0.1)

    this.core   = new PIXI.Sprite(PIXI.utils.TextureCache["clean_bot_core.png"])
    this.core.name = "Core"
    this.core.anchor.set(-0.1)

    sprite.addChild(this.body)
    sprite.addChild(this.lightRing)
    sprite.addChild(this.core)

    return sprite
  }



}

module.exports = CleanBot
