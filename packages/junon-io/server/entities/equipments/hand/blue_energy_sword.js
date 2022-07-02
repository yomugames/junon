const EnergySword = require("./energy_sword")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("../../../../common/constants.json")


class BlueEnergySword extends EnergySword {
  onEquipmentConstructed() {
  }

  getType() {
    return Protocol.definition().BuildingType.BlueEnergySword
  }

  getConstantsTable() {
    return "Equipments.BlueEnergySword"
  }
}

module.exports = BlueEnergySword
