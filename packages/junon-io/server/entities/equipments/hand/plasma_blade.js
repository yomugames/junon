const MeleeEquipment = require("./melee_equipment")

const Protocol = require('../../../../common/util/protocol')


class PlasmaBlade extends MeleeEquipment {
  onEquipmentConstructed() {
  }

  getType() {
    return Protocol.definition().BuildingType.PlasmaBlade
  }

  getConstantsTable() {
    return "Equipments.PlasmaBlade"
  }
}

module.exports = PlasmaBlade
