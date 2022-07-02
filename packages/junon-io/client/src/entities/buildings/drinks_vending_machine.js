const VendingMachine = require("./vending_machine")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class DrinksVendingMachine extends VendingMachine {

  openMenu() {
    this.game.vendingMachineMenu.open("Drinks Vending Machine", this)
  }

  getType() {
    return Protocol.definition().BuildingType.DrinksVendingMachine
  }

  getSpritePath() {
    return "drinks_vending_machine.png"
  }

  getConstantsTable() {
    return "Buildings.DrinksVendingMachine"
  }

}

module.exports = DrinksVendingMachine
