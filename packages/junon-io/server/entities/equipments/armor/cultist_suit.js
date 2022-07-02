const ArmorEquipment = require("./armor_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")
const SocketUtil = require("junon-common/socket_util")

class CultistSuit extends ArmorEquipment {

  getType() {
    return Protocol.definition().BuildingType.CultistSuit
  }

  getConstantsTable() {
    return "Equipments.CultistSuit"
  }
}

module.exports = CultistSuit
