const RawFood = require("./raw_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("../../../common/constants.json")


class BlackMushroom extends RawFood {
  getType() {
    return Protocol.definition().BuildingType.BlackMushroom
  }

  getConstantsTable() {
    return "Foods.BlackMushroom"
  }
}

module.exports = BlackMushroom