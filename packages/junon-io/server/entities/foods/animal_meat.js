const RawFood = require("./raw_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class AnimalMeat extends RawFood {
  getType() {
    return Protocol.definition().BuildingType.AnimalMeat
  }

  getConstantsTable() {
    return "Foods.AnimalMeat"
  }
}

module.exports = AnimalMeat
