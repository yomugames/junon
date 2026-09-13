const RawFood = require("./raw_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("../../../common/constants.json")


class BlueMushroom extends RawFood {
  getType() {
    return Protocol.definition().BuildingType.BlueMushroom
  }

  getConstantsTable() {
    return "Foods.BlueMushroom"
  }
}

module.exports = BlueMushroom