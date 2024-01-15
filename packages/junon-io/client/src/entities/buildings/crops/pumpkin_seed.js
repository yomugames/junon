const BaseSeed = require("./base_seed")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class PumpkinSeed extends BaseSeed {

  getType() {
    return Protocol.definition().BuildingType.PumpkinSeed
  }

  getMatureSpritePath() {
    return "pumpkin_plant.png"
  }

  getSpritePath() {
    return "pumpkin_seed.png"
  }

  getConstantsTable() {
    return "Crops.PumpkinSeed"
  }

}

module.exports = PumpkinSeed