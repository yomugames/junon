const BaseFood = require("./../foods/base_food")

class BaseDrink extends BaseFood {

  static getSellGroup() {
    return "Drinks"
  }

  isAnimatable() {
    return true
  }

  animate() {
    if (this.animationTween) return
    this.animationTween = this.getAnimationTween()
    this.animationTween.start()
  }

  stopAnimation() {
    if (this.animationTween) {
      this.animationTween.stop()
    }

    this.animationTween = null
  }

  getAnimationTween() {
    this.origRotation = this.sprite.rotation
    let rotation = { rotation: this.sprite.rotation }

    const tween = new TWEEN.Tween(rotation)
        .to({ rotation: this.sprite.rotation - Math.PI/3  }, 800)
        .onUpdate(() => {
          this.sprite.rotation = rotation.rotation
        })
        .onStop(() => {
          this.sprite.rotation = this.origRotation
        })
        .yoyo(true)
        .repeat(Infinity)

    return tween
  }

  remove() {
    this.stopAnimation()

    super.remove()
  }
}

module.exports = BaseDrink