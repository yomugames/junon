const BaseFood = require("./base_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class Steak extends BaseFood {
  getType() {
    return Protocol.definition().BuildingType.Steak
  }

  getConstantsTable() {
    return "Foods.Steak"
  }
}

module.exports = Steak
