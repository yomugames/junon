const RangeEquipment = require("./range_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class HeavyRifle extends RangeEquipment {
  repositionSprite() {
    super.repositionSprite()

    this.sprite.position.x = 25
  }

  getSpritePath() {
    return 'heavy_rifle.png'
  }

  getType() {
    return Protocol.definition().BuildingType.HeavyRifle
  }

  getConstantsTable() {
    return "Equipments.HeavyRifle"
  }

}

module.exports = HeavyRifle
