const BaseSeed = require("./base_seed")
const Constants = require("../../../../../common/constants.json")
const Protocol = require("../../../../../common/util/protocol")

class BrownSporeling extends BaseSeed {

  getType() {
    return Protocol.definition().BuildingType.BrownSporeling
  }

  getMatureSpritePath() {
    return "brown_mushroom_plant.png"
  }

  getSpritePath() {
    return "brown_sporeling.png"
  }

  getConstantsTable() {
    return "Crops.BrownSporeling"
  }

}

module.exports = BrownSporeling
