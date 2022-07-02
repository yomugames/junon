const RawFood = require("./raw_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class Potato extends RawFood {
  getType() {
    return Protocol.definition().BuildingType.Potato
  }

  getConstantsTable() {
    return "Foods.Potato"
  }
}

module.exports = Potato
