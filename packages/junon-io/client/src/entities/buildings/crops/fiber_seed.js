const BaseSeed = require("./base_seed")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class FiberSeed extends BaseSeed {

  // constructor(game, data, isEquipDisplay) {
  //   super(game, data, isEquipDisplay)
  // }

  getType() {
    return Protocol.definition().BuildingType.FiberSeed
  }

  getMatureSpritePath() {
    return "fiber_plant.png"
  }

  getSpritePath() {
    return "fiber_seed.png"
  }

  getConstantsTable() {
    return "Crops.FiberSeed"
  }

}

module.exports = FiberSeed
