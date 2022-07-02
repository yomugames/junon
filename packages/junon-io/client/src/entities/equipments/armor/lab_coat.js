const ArmorEquipment = require("./armor_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class LabCoat extends ArmorEquipment {

  getSpritePath() {
    return 'lab_coat.png'
  }

  repositionSprite() {
    super.repositionSprite()
    this.sprite.scale.set(0.9)
    this.sprite.position.x = -20
    this.sprite.position.y = -10
  }

  getType() {
    return Protocol.definition().BuildingType.LabCoat
  }

  getConstantsTable() {
    return "Equipments.LabCoat"
  }


}

module.exports = LabCoat
