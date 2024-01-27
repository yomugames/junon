const RawFood = require("./raw_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class Rice extends RawFood {
  getType() {
    return Protocol.definition().BuildingType.Rice
  }

  getConstantsTable() {
    return "Foods.Rice"
  }
}

module.exports = Rice
