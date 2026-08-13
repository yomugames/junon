const ArmorEquipment = require("./armor_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")

class StrawHat extends ArmorEquipment {

  getType() {
    return Protocol.definition().BuildingType.StrawHat
  }

  getConstantsTable() {
    return "Equipments.StrawHat"
  }
}

module.exports = StrawHat
