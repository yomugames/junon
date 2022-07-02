const ArmorEquipment = require("./armor_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")
const SocketUtil = require("junon-common/socket_util")

class PoliceSuit extends ArmorEquipment {

  getType() {
    return Protocol.definition().BuildingType.PoliceSuit
  }

  getConstantsTable() {
    return "Equipments.PoliceSuit"
  }
}

module.exports = PoliceSuit
