const ArmorEquipment = require("./armor_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class SantaHat extends ArmorEquipment {

  getSpritePath() {
    return 'santa_hat.png'
  }

  repositionSprite() {
    this.sprite.width = 50
    this.sprite.height = 50
    this.sprite.position.x = 0
    this.sprite.position.y = 20
    this.sprite.rotation = -Math.PI/2
  }

  getType() {
    return Protocol.definition().BuildingType.SantaHat
  }

  getConstantsTable() {
    return "Equipments.SantaHat"
  }

}

module.exports = SantaHat