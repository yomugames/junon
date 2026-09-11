const RawFood = require("./raw_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("../../../common/constants.json")


class PurpleMushroom extends RawFood {
  getType() {
    return Protocol.definition().BuildingType.PurpleMushroom
  }

  getConstantsTable() {
    return "Foods.PurpleMushroom"
  }
}

module.exports = PurpleMushroom