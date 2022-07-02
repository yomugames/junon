const BaseSeed = require("./base_seed")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class PotatoSeed extends BaseSeed {

  getType() {
    return Protocol.definition().BuildingType.PotatoSeed
  }

  getMatureSpritePath() {
    return "potato_plant.png"
  }

  getSpritePath() {
    return "potato_seed.png"
  }

  getConstantsTable() {
    return "Crops.PotatoSeed"
  }

}

module.exports = PotatoSeed
