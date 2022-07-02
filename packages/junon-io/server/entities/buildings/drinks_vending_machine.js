const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const VendingMachine = require("./vending_machine")

class DrinksVendingMachine extends VendingMachine {

  getConstantsTable() {
    return "Buildings.DrinksVendingMachine"
  }

  canStoreInBuilding(index, item) {
    if (!item) return true // allow swap with blank space slot
    
    return item.isDrink()
  }

  getType() {
    return Protocol.definition().BuildingType.DrinksVendingMachine
  }

}

module.exports = DrinksVendingMachine

