const BaseSeed = require("./base_seed")
const Constants = require("../../../../../common/constants.json")
const Protocol = require("../../../../../common/util/protocol")

class BlackSporeling extends BaseSeed {

  getType() {
    return Protocol.definition().BuildingType.BlackSporeling
  }

  getMatureSpritePath() {
    return "black_mushroom_plant.png"
  }

  getSpritePath() {
    return "black_sporeling.png"
  }

  getConstantsTable() {
    return "Crops.BlackSporeling"
  }

}

module.exports = BlackSporeling