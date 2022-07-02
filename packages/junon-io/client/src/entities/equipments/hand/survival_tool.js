const MeleeEquipment = require("./melee_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class SurvivalTool extends MeleeEquipment {

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
    return 'mining_gun.png'
  }

  getType() {
    return Protocol.definition().BuildingType.SurvivalTool
  }

  getConstantsTable() {
    return "Equipments.SurvivalTool"
  }

}

module.exports = SurvivalTool
