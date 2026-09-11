const MeleeEquipment = require("./melee_equipment")
const Constants = require("../../../../common/constants.json")
const Protocol = require('../../../../common/util/protocol')

class DrugBottle extends MeleeEquipment {
  use(player, targetEntity) {
  }

  getConstantsTable() {
    return "Equipments.DrugBottle"
  }

  getType() {
    return Protocol.definition().BuildingType.DrugBottle
  }
}

module.exports = DrugBottle
