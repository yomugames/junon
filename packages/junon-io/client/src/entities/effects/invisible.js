const BaseEffect = require("./base_effect")
const Constants = require("./../../../../common/constants.json")

class Invisible extends BaseEffect {

  getConstantsTable() {
    return "Effects.Invisible"
  }

  onPostInit() {
    this.tween = this.getInvisibleTween()
    this.tween.start()
  }

  getInvisibleTween() {
    let opacity = { opacity: 1 }
    let targetOpacity = 0
    if (this.affectedEntity.isPlayer() &&
        this.affectedEntity.isMe()) {
      targetOpacity = 0.2
    }

    const tween = new TWEEN.Tween(opacity)
        .to({ opacity: targetOpacity }, 400)
        .onUpdate(() => {
          this.affectedEntity.sprite.alpha = opacity.opacity
        })

    return tween
  }

  remove() {
    super.remove()

    this.affectedEntity.sprite.alpha = 1
  }


}

module.exports = Invisible
