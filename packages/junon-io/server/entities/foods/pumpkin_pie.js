const BaseFood = require("./base_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class PumpkinPie extends BaseFood {
  getType() {
    return Protocol.definition().BuildingType.PumpkinPie
  }

  getConstantsTable() {
    return "Foods.PumpkinPie"
  }
}

module.exports = PumpkinPie