const MeleeEquipment = require("./melee_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Mop extends MeleeEquipment {

  repositionSprite() {
    super.repositionSprite()
    this.sprite.position.x = 55
  }

  getSpritePath() {
    return 'mop.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Mop
  }

  getConstantsTable() {
    return "Equipments.Mop"
  }

}

module.exports = Mop
