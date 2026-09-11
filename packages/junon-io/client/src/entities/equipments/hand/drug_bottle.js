const MeleeEquipment = require("./melee_equipment")
const Constants = require("../../../../../common/constants.json")
const Protocol = require("../../../../../common/util/protocol")
const ClientHelper = require("../../../util/client_helper")

class DrugBottle extends MeleeEquipment {
  repositionSprite() {
    this.sprite.position.x = 45
    this.sprite.position.y = 20
    this.sprite.rotation = 35 * Math.PI/180
  }

  getInventoryImageStyle() {
    return {
      width: '75%',
      height: '75%',
      transform: 'translate(-50%, -50%) scale(1.4,1.4)'
    }
  }

  getSpritePath() {
    return 'drug_bottle_empty.png'
  }

  getType() {
    return Protocol.definition().BuildingType.DrugBottle
  }

  getConstantsTable() {
    return "Equipments.DrugBottle"
  }
}

module.exports = DrugBottle
