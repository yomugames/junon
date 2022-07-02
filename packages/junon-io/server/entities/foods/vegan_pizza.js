const BaseFood = require("./base_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class VeganPizza extends BaseFood {
  getType() {
    return Protocol.definition().BuildingType.VeganPizza
  }

  getConstantsTable() {
    return "Foods.VeganPizza"
  }
}

module.exports = VeganPizza
