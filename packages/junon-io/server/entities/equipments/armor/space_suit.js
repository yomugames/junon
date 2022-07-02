const ArmorEquipment = require("./armor_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")

class SpaceSuit extends ArmorEquipment {

  hasOxygen() {
    return true
  }

  getDampingFactor() {
    return 0.9
  }


  getType() {
    return Protocol.definition().BuildingType.SpaceSuit
  }

  getConstantsTable() {
    return "Equipments.SpaceSuit"
  }
}

module.exports = SpaceSuit
