const EnergySword = require("./energy_sword")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("../../../../common/constants.json")


class GreenEnergySword extends EnergySword {
  getType() {
    return Protocol.definition().BuildingType.GreenEnergySword
  }

  getConstantsTable() {
    return "Equipments.GreenEnergySword"
  }
}

module.exports = GreenEnergySword
