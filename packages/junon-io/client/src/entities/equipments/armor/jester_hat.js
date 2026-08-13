const ArmorEquipment = require("./armor_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class JesterHat extends ArmorEquipment {

  getSpritePath() {
    return 'jester_hat.png'
  }

  repositionSprite() {
    this.sprite.width = 76
    this.sprite.height = 47
    this.sprite.position.x = 7.5
    this.sprite.position.y = 20
    this.sprite.rotation = -Math.PI/2
  }

  getType() {
    return Protocol.definition().BuildingType.JesterHat
  }

  getConstantsTable() {
    return "Equipments.JesterHat"
  }
}

module.exports = JesterHat
