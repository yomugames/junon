const BaseFood = require("./base_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class Egg extends BaseFood {
  getType() {
    return Protocol.definition().BuildingType.Egg
  }

  getConstantsTable() {
    return "Foods.Egg"
  }
}

module.exports = Egg
