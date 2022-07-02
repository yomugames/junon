const ArmorEquipment = require("./armor_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class PoliceSuit extends ArmorEquipment {

  getSpritePath() {
    return 'police_suit.png'
  }

  repositionSprite() {
    super.repositionSprite()
    this.sprite.scale.set(0.9)
    this.sprite.position.x = -19
    this.sprite.position.y = -8
  }

  getType() {
    return Protocol.definition().BuildingType.PoliceSuit
  }

  getConstantsTable() {
    return "Equipments.PoliceSuit"
  }


}

module.exports = PoliceSuit
