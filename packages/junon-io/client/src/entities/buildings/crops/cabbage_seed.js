const BaseSeed = require("./base_seed")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class CabbageSeed extends BaseSeed {

  getType() {
    return Protocol.definition().BuildingType.CabbageSeed
  }

  getMatureSpritePath() {
    return "cabbage_plant.png"
  }

  getSpritePath() {
    return "cabbage_seed.png"
  }

  getConstantsTable() {
    return "Crops.CabbageSeed"
  }
}

module.exports = CabbageSeed
