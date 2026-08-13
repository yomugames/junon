const ArmorEquipment = require("./armor_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")

class NobleSuit extends ArmorEquipment {

  getType() {
    return Protocol.definition().BuildingType.NobleSuit
  }

  getConstantsTable() {
    return "Equipments.NobleSuit"
  }
}

module.exports = NobleSuit
