const BaseEffect = require("./base_effect")
const Constants = require("./../../../../common/constants.json")

class Spin extends BaseEffect {

  getConstantsTable() {
    return "Effects.Spin"
  }

  onPostInit() {
    this.tween = this.getRotatingTween()
    this.tween.start()
  }

  getRotatingTween() {
    let rotation = { rotation: 0 }

    const tween = new TWEEN.Tween(rotation)
        .to({ rotation: 360 * PIXI.DEG_TO_RAD }, 1500)
        .onUpdate(() => {
          if (this.affectedEntity.getEffectableSprite && this.affectedEntity.getEffectableSprite()) {
            this.affectedEntity.getEffectableSprite().rotation = rotation.rotation
          }
        })
        .repeat(Infinity)

    return tween
  }


}

module.exports = Spin
