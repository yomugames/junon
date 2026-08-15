const MeleeEquipment = require("./melee_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class BaseKnife extends MeleeEquipment {
  repositionSprite() {
    super.repositionSprite()
    
    this.sprite.position.x = this.sprite.height
    this.sprite.position.y = Math.round(this.user.hands.height - this.sprite.height) - 0.5
    
    this.sprite.rotation = -15 * PIXI.DEG_TO_RAD
  }

}

module.exports = BaseKnife
