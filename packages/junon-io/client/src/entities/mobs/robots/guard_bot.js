const BaseRobot = require('./base_robot')
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class GuardBot extends BaseRobot {
  constructor(game, data) {
    super(game, data)

  }

  isInteractable() {
    return true
  }

  setAngle(angle) {
    // dont. we already tween rotation
  }

  getSpritePath() {
    return "guard_bot.png"
  }

  getWidth() {
    return 48
  }

  getHeight() {
    return 48
  }

  getType() {
    return Protocol.definition().MobType.GuardBot
  }

  getConstantsTable() {
    return "Mobs.GuardBot"
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

module.exports = GuardBot
