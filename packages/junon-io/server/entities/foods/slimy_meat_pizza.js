const BaseFood = require("./base_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class SlimyMeatPizza extends BaseFood {
  getType() {
    return Protocol.definition().BuildingType.SlimyMeatPizza
  }

  getConstantsTable() {
    return "Foods.SlimyMeatPizza"
  }
}

module.exports = SlimyMeatPizza
