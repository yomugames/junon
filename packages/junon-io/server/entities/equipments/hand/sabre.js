const MeleeEquipment = require("./melee_equipment")

const Protocol = require('../../../../common/util/protocol')


class Sabre extends MeleeEquipment {
  onEquipmentConstructed() {
  }

  getType() {
    return Protocol.definition().BuildingType.Sabre
  }

  getConstantsTable() {
    return "Equipments.Sabre"
  }
}

module.exports = Sabre
