const ArmorEquipment = require("./armor_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")

class JesterHat extends ArmorEquipment {

  getType() {
    return Protocol.definition().BuildingType.JesterHat
  }

  getConstantsTable() {
    return "Equipments.JesterHat"
  }
}

module.exports = JesterHat
