const ArmorEquipment = require("./armor_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")

class ImperialSpecialForcesArmor extends ArmorEquipment {

  hasOxygen() {
    return true
  }

  getDampingFactor() {
    return 0.9
  }

  getType() {
    return Protocol.definition().BuildingType.ImperialSpecialForcesArmor
  }

  getConstantsTable() {
    return "Equipments.ImperialSpecialForcesArmor"
  }
}

module.exports = ImperialSpecialForcesArmor