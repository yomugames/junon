const ArmorEquipment = require("./armor_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")
const SocketUtil = require("junon-common/socket_util")

class PrisonerSuit extends ArmorEquipment {

  getType() {
    return Protocol.definition().BuildingType.PrisonerSuit
  }

  getConstantsTable() {
    return "Equipments.PrisonerSuit"
  }
}

module.exports = PrisonerSuit
