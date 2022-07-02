const BaseRobot = require('./base_robot')
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class FirstBot extends BaseRobot {
  constructor(game, data) {
    super(game, data)

    this.registerAnimationTween(this.getRotationTween()).start()
  }

  isInteractable() {
    return true
  }

  setAngle(angle) {
    // dont. we already tween rotation
  }

  getSpritePath() {
    return "first_bot.png"
  }

  getType() {
    return Protocol.definition().MobType.FirstBot
  }

  getConstantsTable() {
    return "Mobs.FirstBot"
  }

  getCharacterSprite() {
    const sprite = new PIXI.Container()
    const body   = new PIXI.Sprite(PIXI.utils.TextureCache["first_bot_base.png"])
    body.anchor.set(0.5)

    const legs  = new PIXI.Sprite(PIXI.utils.TextureCache["first_bot_legs.png"])
    legs.anchor.set(0.5)

    this.body = body
    this.legs = legs

    sprite.addChild(legs)
    sprite.addChild(body)

    return sprite
  }

  getRotationTween() {
    let rotation = { rotation: 0 }

    return new TWEEN.Tween(rotation)
        .to({ rotation: Math.PI }, 5000)
        .easing(TWEEN.Easing.Quadratic.Out)
        .onUpdate(() => {
          this.legs.rotation = rotation.rotation
        })
        .onComplete(() => {
        })
        .repeat(Infinity)
        .yoyo(true)
  }


}

module.exports = FirstBot
