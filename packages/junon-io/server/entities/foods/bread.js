const BaseFood = require("./base_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class Bread extends BaseFood {
  getType() {
    return Protocol.definition().BuildingType.Bread
  }

  getConstantsTable() {
    return "Foods.Bread"
  }
}

module.exports = Bread
