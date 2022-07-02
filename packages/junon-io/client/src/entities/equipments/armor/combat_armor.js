const ArmorEquipment = require("./armor_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class CombatArmor extends ArmorEquipment {

  getSpritePath() {
    return 'combat_armor.png'
  }

  repositionSprite() {
    super.repositionSprite()
    this.sprite.position.x = -10
    this.sprite.position.y = -1
  }

  hasOxygen() {
    return true
  }

  getType() {
    return Protocol.definition().BuildingType.CombatArmor
  }

  getConstantsTable() {
    return "Equipments.CombatArmor"
  }

  onPostEquip() {
    super.onPostEquip()

    if (this.user && this.user.isPlayer()) {
      this.user.hands.tint = 0x666666
      this.user.leftHand.tint = 0x666666
      this.user.rightHand.tint = 0x666666
    }
  }


  remove() {
    super.remove()

    if (this.user && this.user.isPlayer()) {
      this.user.hands.tint = 0xd2b48c
      this.user.leftHand.tint = 0xd2b48c
      this.user.rightHand.tint = 0xd2b48c
    }
  }

}

module.exports = CombatArmor
