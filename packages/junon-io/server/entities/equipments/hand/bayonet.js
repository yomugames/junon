const BaseKnife = require("./base_knife")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("../../../../common/constants.json")


class Bayonet extends BaseKnife {

  getType() {
    return Protocol.definition().BuildingType.Bayonet
  }

  getConstantsTable() {
    return "Equipments.Bayonet"
  }
}

module.exports = Bayonet
