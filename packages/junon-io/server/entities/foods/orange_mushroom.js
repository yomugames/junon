const RawFood = require("./raw_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("../../../common/constants.json")


class OrangeMushroom extends RawFood {
  getType() {
    return Protocol.definition().BuildingType.OrangeMushroom
  }

  getConstantsTable() {
    return "Foods.OrangeMushroom"
  }
}

module.exports = OrangeMushroom