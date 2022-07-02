const BaseEquipment = require("./../base_equipment")

class HandEquipment extends BaseEquipment {
  getSpriteContainer() {
    return this.data.user.handEquipContainer
  }

  playSound() {
    if (this.hasCategory("melee_damage")) {
      this.game.playSound("melee_damage")
    }
  }

  isWeapon() {
    return true
  }

  repositionSprite() {
    this.sprite.anchor.set(0)

    this.sprite.position.x = 45
    this.sprite.position.y = 32
  }
}

module.exports = HandEquipment