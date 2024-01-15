const RawFood = require("./raw_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class Pumpkin extends RawFood {
  getType() {
    return Protocol.definition().BuildingType.Pumpkin
  }

  getConstantsTable() {
    return "Foods.Pumpkin"
  }
}

module.exports = Pumpkin
