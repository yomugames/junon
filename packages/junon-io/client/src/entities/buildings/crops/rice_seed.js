const BaseSeed = require("./base_seed")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class RiceSeed extends BaseSeed {

  // constructor(game, data, isEquipDisplay) {
  //   super(game, data, isEquipDisplay)
  // }

  getType() {
    return Protocol.definition().BuildingType.RiceSeed
  }

  getMatureSpritePath() {
    return "rice_plant.png"
  }

  getSpritePath() {
    return "rice_seed.png"
  }

  getConstantsTable() {
    return "Crops.RiceSeed"
  }

}

module.exports = RiceSeed
