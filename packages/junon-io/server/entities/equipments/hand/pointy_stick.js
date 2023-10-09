const MeleeEquipment = require("./melee_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("../../../../common/constants.json")


class PointyStick extends MeleeEquipment {
  onEquipmentConstructed() {
  }

  getType() {
    return Protocol.definition().BuildingType.PointyStick
  }

  getConstantsTable() {
    return "Equipments.PointyStick"
  }
}

module.exports = PointyStick