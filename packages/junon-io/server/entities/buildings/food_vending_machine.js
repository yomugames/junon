const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const VendingMachine = require("./vending_machine")

class FoodVendingMachine extends VendingMachine {

  getConstantsTable() {
    return "Buildings.FoodVendingMachine"
  }

  canStoreInBuilding(index, item) {
    if (!item) return true // allow swap with blank space slot
    
    return item.isFood()
  }

  getType() {
    return Protocol.definition().BuildingType.FoodVendingMachine
  }

}

module.exports = FoodVendingMachine

