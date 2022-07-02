const VendingMachine = require("./vending_machine")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class FoodVendingMachine extends VendingMachine {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  openMenu() {
    this.game.vendingMachineMenu.open("Food Vending Machine", this)
  }

  getType() {
    return Protocol.definition().BuildingType.FoodVendingMachine
  }

  getSpritePath() {
    return "food_vending_machine.png"
  }

  getConstantsTable() {
    return "Buildings.FoodVendingMachine"
  }

}

module.exports = FoodVendingMachine
