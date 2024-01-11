const BaseFood = require("./base_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("../../../common/constants.json")

class Nigiri extends BaseFood {
  getType() {
    return Protocol.definition().BuildingType.Nigiri
  }

  getConstantsTable() {
    return "Foods.Nigiri"
  }
}

module.exports = Nigiri
