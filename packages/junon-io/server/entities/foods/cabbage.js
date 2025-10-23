const RawFood = require("./raw_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class Cabbage extends RawFood {
  getType() {
    return Protocol.definition().BuildingType.Cabbage
  }

  getConstantsTable() {
    return "Foods.Cabbage"
  }
}

module.exports = Cabbage