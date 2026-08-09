const HandEquipment = require("./hand_equipment")

class RangeEquipment extends HandEquipment {
  repositionSprite() {
    this.sprite.anchor.set(0)

    this.sprite.position.x = 35
    this.sprite.position.y = 12

    this.user.hands.x = 0
    this.user.hands.y = 0

    this.user.holdHands()
  }

  getAnimationTween() {
  const ms = 400

    const startWeaponX = this.sprite.x
    const startHandsX = this.user.hands.x
    
    const recoilX = -10
    
    const pos = { 
      weaponX: startWeaponX,
      handsX: startHandsX
    }
    
    const endWeaponX = startWeaponX + recoilX
    const endHandsX = startHandsX + recoilX
    
    const recoil = new TWEEN.Tween(pos)
      .to({ 
        weaponX: endWeaponX,
        handsX: endHandsX
      }, ms)
      .easing(TWEEN.Easing.Quadratic.Out)
      .onUpdate(() => {
        this.sprite.x = pos.weaponX
        this.user.hands.x = pos.handsX
      })
      .onComplete(() => {
        new TWEEN.Tween(pos)
          .to({ 
            weaponX: startWeaponX,
            handsX: startHandsX
          }, ms)
          .easing(TWEEN.Easing.Quadratic.In)
          .onUpdate(() => {
            this.sprite.x = pos.weaponX
            this.user.hands.x = pos.handsX
          })
          .onComplete(() => {
            this.isAnimating = false
            this.onAttackAnimationComplete()
          })
          .start()
      })
      .onStart(() => {
        this.isAnimating = true
        this.onAttackAnimationStart()
      })
    
    return recoil
  }

  animate() {
    if (this.currentTween) {
      this.repositionSprite()
      this.currentTween.stop()
      this.currentTween = null
    }
    
    this.currentTween = this.getAnimationTween()
    this.currentTween.start()
  }

  onAttackAnimationStart() {
  }

  onAttackAnimationComplete() {
    this.repositionSprite()
  }

  getRange() {
    return this.getConstants().stats.range
  }

}

module.exports = RangeEquipment