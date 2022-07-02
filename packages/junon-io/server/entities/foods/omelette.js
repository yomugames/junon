const BaseFood = require("./base_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class Omelette extends BaseFood {
  getType() {
    return Protocol.definition().BuildingType.Omelette
  }

  getConstantsTable() {
    return "Foods.Omelette"
  }
}

module.exports = Omelette
