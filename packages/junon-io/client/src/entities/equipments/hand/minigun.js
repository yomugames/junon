const RangeEquipment = require("./range_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Minigun extends RangeEquipment {
  repositionSprite() {
    super.repositionSprite()

    this.sprite.position.x = 20
    this.sprite.position.y = 5
    
    this.user.holdHandsHeavy()
  }

  getSpritePath() {
    return 'minigun.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Minigun
  }

  getConstantsTable() {
    return "Equipments.Minigun"
  }

}

module.exports = Minigun
