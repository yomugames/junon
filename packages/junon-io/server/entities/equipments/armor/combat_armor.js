const ArmorEquipment = require("./armor_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")

class CombatArmor extends ArmorEquipment {

  hasOxygen() {
    return true
  }

  getDampingFactor() {
    return 0.9
  }

  getType() {
    return Protocol.definition().BuildingType.CombatArmor
  }

  getConstantsTable() {
    return "Equipments.CombatArmor"
  }
}

module.exports = CombatArmor
