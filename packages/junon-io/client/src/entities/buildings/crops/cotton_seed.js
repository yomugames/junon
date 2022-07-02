const BaseSeed = require("./base_seed")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class CottonSeed extends BaseSeed {

  getType() {
    return Protocol.definition().BuildingType.CottonSeed
  }

  getMatureSpritePath() {
    return "cotton_plant.png"
  }

  getSpritePath() {
    return "cotton_seed.png"
  }

  getConstantsTable() {
    return "Crops.CottonSeed"
  }

}

module.exports = CottonSeed
