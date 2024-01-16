const BaseFood = require("./base_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class Apple extends BaseFood {
  getType() {
    return Protocol.definition().BuildingType.Apple
  }

  getConstantsTable() {
    return "Foods.Apple"
  }
}

module.exports = Apple
