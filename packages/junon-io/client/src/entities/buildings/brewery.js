const Drinks = require("./../drinks/index")
const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Brewery extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  openMenu() {
    const templateList = Drinks.getDrinkables()

    let options = {}
    if (!this.isPowered) {
      options["disabled"] = "Insufficient Power"
    }

    this.game.craftMenu.open("Brewery", "Brew", this.id, templateList, options)
  }

  getType() {
    return Protocol.definition().BuildingType.Brewery
  }

  getSpritePath() {
    return "brewery.png"
  }

  getConstantsTable() {
    return "Buildings.Brewery"
  }

}

module.exports = Brewery
