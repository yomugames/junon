const MeleeEquipment = require("./melee_equipment")
const Constants = require("../../../../common/constants.json")
const Protocol = require('../../../../common/util/protocol')

class Bowl extends MeleeEquipment {
  use(player, targetEntity) {
  }

  getConstantsTable() {
    return "Equipments.Bowl"
  }

  getType() {
    return Protocol.definition().BuildingType.Bowl
  }
}

module.exports = Bowl
