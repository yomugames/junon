const MeleeEquipment = require("./melee_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class PoisonGrenade extends MeleeEquipment {

  getSpritePath() {
    return 'poison_grenade.png'
  }

  repositionSprite() {
    this.sprite.position.x = 50
    this.sprite.position.y = 30
    this.sprite.rotation = 35 * Math.PI/180
  }

  getType() {
    return Protocol.definition().BuildingType.PoisonGrenade
  }

  getConstantsTable() {
    return "Equipments.PoisonGrenade"
  }

}

module.exports = PoisonGrenade
