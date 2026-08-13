const ArmorEquipment = require("./armor_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class CowboyHat extends ArmorEquipment {

  getSpritePath() {
    return 'cowboy_hat.png'
  }

  repositionSprite() {
    this.sprite.width = 32
    this.sprite.height = 53
    this.sprite.position.x = 7.5
    this.sprite.position.y = 19.5
  }

  getType() {
    return Protocol.definition().BuildingType.CowboyHat
  }

  getConstantsTable() {
    return "Equipments.CowboyHat"
  }
}

module.exports = CowboyHat
