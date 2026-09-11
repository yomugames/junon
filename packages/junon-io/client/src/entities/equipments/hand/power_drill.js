const MeleeEquipment = require("./melee_equipment")
const Constants = require("../../../../../common/constants.json")
const Protocol = require("../../../../../common/util/protocol")

class PowerDrill extends MeleeEquipment {

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
    return 'power_drill.png'
  }

  getInventoryImageStyle() {
    return {
      width: '75%',
      height: '75%',
      transform: 'translate(-50%, -50%) scaleY(1.5)'
    }
  }

  getType() {
    return Protocol.definition().BuildingType.PowerDrill
  }

  getConstantsTable() {
    return "Equipments.PowerDrill"
  }

}

module.exports = PowerDrill
