const EnergySword = require("./energy_sword")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("../../../../common/constants.json")


class RedEnergySword extends EnergySword {
  getType() {
    return Protocol.definition().BuildingType.RedEnergySword
  }

  getConstantsTable() {
    return "Equipments.RedEnergySword"
  }
}

module.exports = RedEnergySword
