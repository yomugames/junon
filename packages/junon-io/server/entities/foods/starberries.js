const BaseFood = require("./base_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class Starberries extends BaseFood {
  getType() {
    return Protocol.definition().BuildingType.Starberries
  }

  getConstantsTable() {
    return "Foods.Starberries"
  }
}

module.exports = Starberries
