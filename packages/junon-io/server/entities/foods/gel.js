const RawFood = require("./raw_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class Gel extends RawFood {
  getType() {
    return Protocol.definition().BuildingType.Gel
  }

  getConstantsTable() {
    return "Foods.Gel"
  }
}

module.exports = Gel
