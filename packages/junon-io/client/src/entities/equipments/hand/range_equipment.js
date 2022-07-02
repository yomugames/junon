const HandEquipment = require("./hand_equipment")

class RangeEquipment extends HandEquipment {
  repositionSprite() {
    this.sprite.anchor.set(0)

    this.sprite.position.x = 35
    this.sprite.position.y = 12

    this.user.closeHands()
  }

  getRange() {
    return this.getConstants().stats.range
  }

}

module.exports = RangeEquipment
