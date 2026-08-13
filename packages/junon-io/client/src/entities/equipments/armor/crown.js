const ArmorEquipment = require("./armor_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Crown extends ArmorEquipment {
  getSpritePath() {
    return 'crown.png'
  }
  
  repositionSprite() {
    this.sprite.width = 38
    this.sprite.height = 25
    this.sprite.position.x = 15.125
    this.sprite.position.y = 19.5
    this.sprite.rotation = -Math.PI/2
  }

  getType() {
    return Protocol.definition().BuildingType.Crown
  }

  getConstantsTable() {
    return "Equipments.Crown"
  }

}

module.exports = Crown