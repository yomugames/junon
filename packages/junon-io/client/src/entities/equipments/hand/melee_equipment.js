const HandEquipment = require("./hand_equipment")

class MeleeEquipment extends HandEquipment {
  repositionSprite() {
    this.sprite.anchor.set(0)

    this.sprite.rotation = 90 * PIXI.DEG_TO_RAD

    if (!this.getConstants().sprite) {
      this.sprite.position.x = 50
    }


    this.user.openHands()
  }

  getAnimationTween() {
    let halfRotation = 90 * (Math.PI / 180)
    let startRotation = this.user.getRadAngle()
    let midRotation   = this.user.getRadAngle() - (halfRotation)
    let endRotation   = this.user.getRadAngle() - (halfRotation * 2)
    let rotation = { rotation: startRotation }

    const swing = new TWEEN.Tween(rotation)
        .to({ rotation: endRotation  }, 400)
        .onUpdate(() => {
          let progress = Math.abs(rotation.rotation - startRotation)
          if (progress > halfRotation) {
            let backIncrement = progress - halfRotation
            let backRotation = midRotation + backIncrement

            this.user.characterSprite.rotation = backRotation
          } else {
            this.user.characterSprite.rotation = rotation.rotation
          }
        })
        .onRepeatCycleComplete(() => {
          startRotation = this.user.getRadAngle()
          midRotation   = this.user.getRadAngle() - (halfRotation)
          endRotation   = this.user.getRadAngle() - (halfRotation * 2)
          rotation = { rotation: startRotation }

          swing._object = rotation
          swing._valuesEnd = { rotation: endRotation }

        })
        .onComplete(() => {
          this.user.characterSprite.rotation = this.user.getRadAngle()
          this.onAttackAnimationComplete()
        })
        .onStart(() => {
          this.onAttackAnimationStart()
        })



    return swing
  }

  animate() {
    this.getAnimationTween().start()
  }

  onAttackAnimationStart() {
    
  }

  onAttackAnimationComplete() {

  }


}

module.exports = MeleeEquipment
