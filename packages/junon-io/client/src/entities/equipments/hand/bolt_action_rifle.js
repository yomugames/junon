const RangeEquipment = require("./range_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class BoltActionRifle extends RangeEquipment {
  repositionSprite() {
    super.repositionSprite()

    this.sprite.position.x = 25
  }

  getSpritePath() {
    return 'bolt_action_rifle.png'
  }

  getType() {
    return Protocol.definition().BuildingType.BoltActionRifle
  }

  getConstantsTable() {
    return "Equipments.BoltActionRifle"
  }

}

module.exports = BoltActionRifle
