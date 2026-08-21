const RangeEquipment = require("./range_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Uzi extends RangeEquipment {

  getSpritePath() {
    return 'uzi2.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Uzi
  }

  repositionSprite() {
    super.repositionSprite()
    this.sprite.height = 20
    this.sprite.width = 60
    this.sprite.x = 28
    this.sprite.y = 10
  }

  getConstantsTable() {
    return "Equipments.Uzi"
  }

}

module.exports = Uzi
