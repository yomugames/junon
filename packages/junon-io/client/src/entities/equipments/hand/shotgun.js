const RangeEquipment = require("./range_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Shotgun extends RangeEquipment {
  repositionSprite() {
    super.repositionSprite()
    this.sprite.position.x = 23
  }

  getSpritePath() {
    return 'shotgun_reskin.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Shotgun
  }

  getConstantsTable() {
    return "Equipments.Shotgun"
  }

}

module.exports = Shotgun
