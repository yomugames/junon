const MeleeEquipment = require("./melee_equipment")

const Protocol = require('../../../../common/util/protocol')


class PlasmaSabre extends MeleeEquipment {
  onEquipmentConstructed() {
  }

  getType() {
    return Protocol.definition().BuildingType.PlasmaSabre
  }

  getConstantsTable() {
    return "Equipments.PlasmaSabre"
  }
}

module.exports = PlasmaSabre
