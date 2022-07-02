const ArmorEquipment = require("./armor_equipment")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")
const SocketUtil = require("junon-common/socket_util")

class LabCoat extends ArmorEquipment {

  getType() {
    return Protocol.definition().BuildingType.LabCoat
  }

  getConstantsTable() {
    return "Equipments.LabCoat"
  }
}

module.exports = LabCoat
