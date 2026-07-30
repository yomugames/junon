const RangeEquipment = require("./range_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Ak47 extends RangeEquipment {
  repositionSprite() {
    super.repositionSprite()

    this.sprite.position.x = 25
  }

  getSpritePath() {
    return 'ak47.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Ak47
  }

  getConstantsTable() {
    return "Equipments.Ak47"
  }

}

module.exports = Ak47
