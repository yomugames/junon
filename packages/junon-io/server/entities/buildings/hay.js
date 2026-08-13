const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")


class Hay extends BaseBuilding {
  getConstantsTable() {
    return "Buildings.Beaker"
  }

  getType() {
    return Protocol.definition().BuildingType.Hay
  }

}

module.exports = Hay