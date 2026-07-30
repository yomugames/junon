const RangeEquipment = require("./range_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class GrenadeLauncher extends RangeEquipment {
  repositionSprite() {
    super.repositionSprite()
    
    this.sprite.position.y = 5
    
    this.user.holdHandsLauncher()
  }

  getSpritePath() {
    return 'grenade_launcher.png'
  }

  getType() {
    return Protocol.definition().BuildingType.GrenadeLauncher
  }

  getConstantsTable() {
    return "Equipments.GrenadeLauncher"
  }

}

module.exports = GrenadeLauncher
