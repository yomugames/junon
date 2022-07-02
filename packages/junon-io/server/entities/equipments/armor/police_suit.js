const ArmorEquipment = require("./armor_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")

class PoliceSuit extends ArmorEquipment {

  getType() {
    return Protocol.definition().BuildingType.PoliceSuit
  }

  getConstantsTable() {
    return "Equipments.PoliceSuit"
  }
}

module.exports = PoliceSuit
