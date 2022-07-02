const BaseEffect = require("./base_effect")
const Constants = require("./../../../../common/constants.json")

class Miasma extends BaseEffect {

  getConstantsTable() {
    return "Effects.Miasma"
  }

  onPostInit() {
    // this.sprite.position.x = this.affectedEntity.getX()
    // this.sprite.position.y = this.affectedEntity.getY()
    this.sprite.tint = 0x9839a6
    this.sprite.alpha = 0.5 

    let affectedSprite = this.affectedEntity.characterSprite || this.affectedEntity.buildingSprite

    let width = affectedSprite.width + Math.floor(Math.random() * Constants.tileSize)
    this.sprite.width  = width
    this.sprite.height = width

    this.tween = this.getAnimationTween() 
    this.tween.start()
  }


  getAnimationTween() {
    let origWidth = this.sprite.width
    const maxExpansion = 10
    const desiredWidth = origWidth + maxExpansion
    let width = { width: origWidth }

    var tween = new TWEEN.Tween(width)
        .to({ width: desiredWidth }, 1000)
        .onUpdate(() => {
          let diff = desiredWidth - width.width
          this.sprite.width = width.width
          this.sprite.height = width.width
          this.sprite.alpha = 0.5 + (diff / maxExpansion) / 3
        })
        .yoyo(true)
        .repeat(Infinity)

     return tween
  }

  // must position and tween (variable circle width)

  onLevelChanged(level) {
    if (level <= 0) return
  }

  // getEffectSpriteContainer() {
  //   return this.game.sector.effectsContainer
  // }


}

module.exports = Miasma

