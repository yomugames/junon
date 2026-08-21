const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const VendingMachine = require("./vending_machine")

class Dispenser extends VendingMachine {

  getConstantsTable() {
    return "Buildings.Dispenser"
  }

  getType() {
    return Protocol.definition().BuildingType.Dispenser
  }

}

module.exports = Dispenser