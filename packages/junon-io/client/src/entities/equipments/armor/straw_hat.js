const ArmorEquipment = require("./armor_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class StrawHat extends ArmorEquipment {

  getSpritePath() {
    return 'straw_hat.png'
  }
  
  repositionSprite() {
    this.sprite.width = 53
    this.sprite.height = 32
    this.sprite.position.x = 7.125
    this.sprite.position.y = 19.5
    this.sprite.rotation = -Math.PI/2
  }

  getType() {
    return Protocol.definition().BuildingType.StrawHat
  }

  getConstantsTable() {
    return "Equipments.StrawHat"
  }

}

module.exports = StrawHat