const BaseSeed = require("./base_seed")
const Constants = require("../../../../../common/constants.json")
const Protocol = require("../../../../../common/util/protocol")

class PinkSporeling extends BaseSeed {

  getType() {
    return Protocol.definition().BuildingType.PinkSporeling
  }

  getMatureSpritePath() {
    return "pink_mushroom_plant.png"
  }

  getSpritePath() {
    return "pink_sporeling.png"
  }

  getConstantsTable() {
    return "Crops.PinkSporeling"
  }

}

module.exports = PinkSporeling