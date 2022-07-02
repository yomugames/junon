const ArmorEquipment = require("./armor_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class PrisonerSuit extends ArmorEquipment {

  getSpritePath() {
    return 'prisoner_suit.png'
  }

  repositionSprite() {
    super.repositionSprite()
    this.sprite.scale.set(0.9)
    this.sprite.position.x = -12
    this.sprite.position.y = -10
  }

  getType() {
    return Protocol.definition().BuildingType.PrisonerSuit
  }

  getConstantsTable() {
    return "Equipments.PrisonerSuit"
  }


}

module.exports = PrisonerSuit
