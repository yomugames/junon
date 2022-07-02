const ArmorEquipment = require("./armor_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class HazmatSuit extends ArmorEquipment {

  getSpritePath() {
    return 'hazmat_suit_2.png'
  }

  repositionSprite() {
    super.repositionSprite()
    this.sprite.scale.set(0.75)
    this.sprite.position.x = -22
    this.sprite.position.y = -16
  }

  hasOxygen() {
    return true
  }

  getType() {
    return Protocol.definition().BuildingType.HazmatSuit
  }

  getConstantsTable() {
    return "Equipments.HazmatSuit"
  }


}

module.exports = HazmatSuit
