const MeleeEquipment = require("./melee_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("../../../../common/constants.json")


class LeadPipe extends MeleeEquipment {
  onEquipmentConstructed() {
  }

  getType() {
    return Protocol.definition().BuildingType.LeadPipe
  }

  getConstantsTable() {
    return "Equipments.LeadPipe"
  }
}

module.exports = LeadPipe
