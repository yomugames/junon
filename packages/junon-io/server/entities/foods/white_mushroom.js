const RawFood = require("./raw_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("../../../common/constants.json")


class WhiteMushroom extends RawFood {
  getType() {
    return Protocol.definition().BuildingType.WhiteMushroom
  }

  getConstantsTable() {
    return "Foods.WhiteMushroom"
  }
}

module.exports = WhiteMushroom