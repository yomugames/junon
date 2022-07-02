const MeleeEquipment = require("./melee_equipment")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class LeadPipe extends MeleeEquipment {

  getSpritePath() {
    return 'lead_pipe.png'
  }

  getType() {
    return Protocol.definition().BuildingType.LeadPipe
  }

  getConstantsTable() {
    return "Equipments.LeadPipe"
  }

}

module.exports = LeadPipe
