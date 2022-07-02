const BaseEffect = require("./base_effect")
const Constants = require("./../../../../common/constants.json")
const ClientHelper = require("./../../util/client_helper")

class Fire extends BaseEffect {

  getConstantsTable() {
    return "Effects.Fire"
  }

  onPostInit() {
    if (this.affectedEntity.isTerrain()) {
      this.sprite.position.set(this.affectedEntity.getX(), this.affectedEntity.getY())
    }

    this.onLevelChanged(1)
  }  

  onLevelChanged(level) {
    this.setSize(level)
    this.reinitTween()
  }

  setSize(level) {
    let size = (level / this.getMaxEffectLevel()) * Constants.tileSize
    this.sprite.width  = size
    this.sprite.height = size
  }

  remove() {
    super.remove()
  }

  reinitTween() {
    if (this.tween) {
      this.tween.stop()
    }

    this.tween = this.getAnimationTween()
    this.tween.start()
  }

  getAnimationTween() {
    const origWidth = this.sprite.width
    const maxExpansion = 10
    const desiredWidth = origWidth + maxExpansion
    let width = { width: origWidth }
    const widthToShiftPosition = origWidth 
    const amountToShift = (Constants.tileSize * 2) / origWidth + 5 // the smaller it is,  the more it shift around
    const origX = this.getX()
    const origY = this.getY()
    const shouldShift = !this.isTargetLivingEntity()
    const tweenSpeed = this.isTargetLivingEntity() ? 300 : 1000

    var tween = new TWEEN.Tween(width)
        .to({ width: desiredWidth }, tweenSpeed)
        .onUpdate(() => {
          if (shouldShift && width.width === widthToShiftPosition) {
            let randomX = amountToShift/2 - Math.floor(Math.random() * amountToShift)
            let randomY = amountToShift/2 - Math.floor(Math.random() * amountToShift)
            this.sprite.position.set(origX + randomX, origY + randomY)
          }
          this.sprite.width = width.width
          this.sprite.height = width.width
        })
        .yoyo(true)
        .repeat(Infinity)

    return tween
  }


}

module.exports = Fire
