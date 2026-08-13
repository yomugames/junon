const ArmorEquipment = require("./armor_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")

class Wreath extends ArmorEquipment {

  getType() {
    return Protocol.definition().BuildingType.Wreath
  }

  getConstantsTable() {
    return "Equipments.Wreath"
  }
}

module.exports = Wreath
