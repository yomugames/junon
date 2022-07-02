const MeleeEquipment = require("./melee_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Drill extends MeleeEquipment {

  repositionSprite() {
    this.sprite.position.x = 40
    this.sprite.position.y = 35
  }

  isMiningEquipment() {
    return true
  }

  shouldNotInteractBuildings() {
    return false
  }

  getSpritePath() {
    return 'drill.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Drill
  }

  getConstantsTable() {
    return "Equipments.Drill"
  }

}

module.exports = Drill
