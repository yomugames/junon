const ArmorEquipment = require("./armor_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")

class CultistSuit extends ArmorEquipment {

  getType() {
    return Protocol.definition().BuildingType.CultistSuit
  }

  getConstantsTable() {
    return "Equipments.CultistSuit"
  }
}

module.exports = CultistSuit
