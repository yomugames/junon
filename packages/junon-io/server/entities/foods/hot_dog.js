const BaseFood = require("./base_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class HotDog extends BaseFood {
  getType() {
    return Protocol.definition().BuildingType.HotDog
  }

  getConstantsTable() {
    return "Foods.HotDog"
  }
}

module.exports = HotDog
