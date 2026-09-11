const RawFood = require("./raw_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("../../../common/constants.json")


class GreenMushroom extends RawFood {
  getType() {
    return Protocol.definition().BuildingType.GreenMushroom
  }

  getConstantsTable() {
    return "Foods.GreenMushroom"
  }
}

module.exports = GreenMushroom