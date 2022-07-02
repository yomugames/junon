const RawFood = require("./raw_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class AlienMeat extends RawFood {
  getType() {
    return Protocol.definition().BuildingType.AlienMeat
  }

  getConstantsTable() {
    return "Foods.AlienMeat"
  }
}

module.exports = AlienMeat
