const RawFood = require("./raw_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class Wheat extends RawFood {
  getType() {
    return Protocol.definition().BuildingType.Wheat
  }

  getConstantsTable() {
    return "Foods.Wheat"
  }
}

module.exports = Wheat
