const ArmorEquipment = require("./armor_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class NobleSuit extends ArmorEquipment {

  getSpritePath() {
    return 'noble_suit.png'
  }

  repositionSprite() {
    super.repositionSprite()
    this.sprite.scale.set(0.9)
    this.sprite.position.x = -14
    this.sprite.position.y = -8
  }

  getType() {
    return Protocol.definition().BuildingType.NobleSuit
  }

  getConstantsTable() {
    return "Equipments.NobleSuit"
  }


}

module.exports = NobleSuit
