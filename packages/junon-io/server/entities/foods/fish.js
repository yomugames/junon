const BaseFood = require("./base_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class Fish extends BaseFood {
  getType() {
    return Protocol.definition().BuildingType.Fish
  }

  getConstantsTable() {
    return "Foods.Fish"
  }
}

module.exports = Fish