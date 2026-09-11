const RawFood = require("./raw_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("../../../common/constants.json")


class PinkMushroom extends RawFood {
  getType() {
    return Protocol.definition().BuildingType.PinkMushroom
  }

  getConstantsTable() {
    return "Foods.PinkMushroom"
  }
}

module.exports = PinkMushroom