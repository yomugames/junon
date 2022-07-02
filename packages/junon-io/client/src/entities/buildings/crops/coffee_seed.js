const BaseSeed = require("./base_seed")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class CoffeeSeed extends BaseSeed {

  // constructor(game, data, isEquipDisplay) {
  //   super(game, data, isEquipDisplay)
  // }

  getType() {
    return Protocol.definition().BuildingType.CoffeeSeed
  }

  getMatureSpritePath() {
    return "coffee_plant.png"
  }

  getSpritePath() {
    return "coffee_seed.png"
  }

  getConstantsTable() {
    return "Crops.CoffeeSeed"
  }

}

module.exports = CoffeeSeed
