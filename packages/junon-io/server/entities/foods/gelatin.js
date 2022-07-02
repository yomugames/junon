const BaseFood = require("./base_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class Gelatin extends BaseFood {
  getType() {
    return Protocol.definition().BuildingType.Gelatin
  }

  getConstantsTable() {
    return "Foods.Gelatin"
  }
}

module.exports = Gelatin
