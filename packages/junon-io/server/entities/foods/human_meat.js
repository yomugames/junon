const RawFood = require("./raw_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class HumanMeat extends RawFood {
  getType() {
    return Protocol.definition().BuildingType.HumanMeat
  }

  getConstantsTable() {
    return "Foods.HumanMeat"
  }
}

module.exports = HumanMeat
