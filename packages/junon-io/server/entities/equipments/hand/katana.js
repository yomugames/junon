const MeleeEquipment = require("./melee_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("../../../../common/constants.json")


class Katana extends MeleeEquipment {
  onEquipmentConstructed() {
  }

  getType() {
    return Protocol.definition().BuildingType.Katana
  }

  getConstantsTable() {
    return "Equipments.Katana"
  }
}

module.exports = Katana
