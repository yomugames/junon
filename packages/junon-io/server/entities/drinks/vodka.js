const Beer = require("./beer")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class Vodka extends Beer {
  getType() {
    return Protocol.definition().BuildingType.Vodka
  }

  getConstantsTable() {
    return "Drinks.Vodka"
  }
}

module.exports = Vodka
