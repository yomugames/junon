const RangeEquipment = require("./range_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class AssaultRifle extends RangeEquipment {

  repositionSprite() {
    super.repositionSprite()

    this.sprite.position.x = 20
  }

  getSpritePath() {
    return 'assault_rifle.png'
  }

  getType() {
    return Protocol.definition().BuildingType.AssaultRifle
  }

  getConstantsTable() {
    return "Equipments.AssaultRifle"
  }

}

module.exports = AssaultRifle
