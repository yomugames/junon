const BaseSeed = require("./base_seed")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class WheatSeed extends BaseSeed {

  // constructor(game, data, isEquipDisplay) {
  //   super(game, data, isEquipDisplay)
  // }

  getType() {
    return Protocol.definition().BuildingType.WheatSeed
  }

  getMatureSpritePath() {
    return "wheat_plant.png"
  }

  getSpritePath() {
    return "wheat_seed.png"
  }

  getConstantsTable() {
    return "Crops.WheatSeed"
  }

}

module.exports = WheatSeed
