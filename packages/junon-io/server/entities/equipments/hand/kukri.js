const BaseKnife = require("./base_knife")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("../../../../common/constants.json")


class Kukri extends BaseKnife {
  getType() {
    return Protocol.definition().BuildingType.Kukri
  }

  getConstantsTable() {
    return "Equipments.Kukri"
  }
}

module.exports = Kukri
