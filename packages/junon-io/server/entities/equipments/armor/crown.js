const ArmorEquipment = require("./armor_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")

class Crown extends ArmorEquipment {

  getType() {
    return Protocol.definition().BuildingType.Crown
  }

  getConstantsTable() {
    return "Equipments.Crown"
  }
}

module.exports = Crown
