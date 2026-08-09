const VendingMachine = require("./vending_machine")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Dispenser extends VendingMachine {

  openMenu() {
    this.game.vendingMachineMenu.open("Dispenser", this)
  }

  getType() {
    return Protocol.definition().BuildingType.Dispenser
  }

  getSpritePath() {
    return "dispenser.png"
  }

  getConstantsTable() {
    return "Buildings.Dispenser"
  }

}

module.exports = Dispenser
