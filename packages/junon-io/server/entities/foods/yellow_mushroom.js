const RawFood = require("./raw_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("../../../common/constants.json")


class YellowMushroom extends RawFood {
  getType() {
    return Protocol.definition().BuildingType.YellowMushroom
  }

  getConstantsTable() {
    return "Foods.YellowMushroom"
  }
}

module.exports = YellowMushroom