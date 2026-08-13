const ArmorEquipment = require("./armor_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Wreath extends ArmorEquipment {

  getSpritePath() {
    return 'wreath.png'
  }
  
  repositionSprite() {
    this.sprite.width = 40
    this.sprite.height = 46
    this.sprite.position.x = 13.5
    this.sprite.position.y = 19.5
  }

  getType() {
    return Protocol.definition().BuildingType.Wreath
  }

  getConstantsTable() {
    return "Equipments.Wreath"
  }

}

module.exports = Wreath