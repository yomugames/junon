const EnergySword = require("./energy_sword")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("../../../../common/constants.json")


class FusionSword extends EnergySword {
  getType() {
    return Protocol.definition().BuildingType.FusionSword
  }

  getConstantsTable() {
    return "Equipments.FusionSword"
  }
}

module.exports = FusionSword
