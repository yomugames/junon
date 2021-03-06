const ArmorEquipment = require("./armor_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")

class HazmatSuit extends ArmorEquipment {

  hasOxygen() {
    return true
  }

  getImmunity() {
    return ["poison", "miasma"]
  }

  getType() {
    return Protocol.definition().BuildingType.HazmatSuit
  }

  getConstantsTable() {
    return "Equipments.HazmatSuit"
  }
}

module.exports = HazmatSuit
