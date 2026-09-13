const BaseSeed = require("./base_seed")
const Constants = require("../../../../../common/constants.json")
const Protocol = require("../../../../../common/util/protocol")

class YellowSporeling extends BaseSeed {

  getType() {
    return Protocol.definition().BuildingType.YellowSporeling
  }

  getMatureSpritePath() {
    return "yellow_mushroom_plant.png"
  }

  getSpritePath() {
    return "yellow_sporeling.png"
  }

  getConstantsTable() {
    return "Crops.YellowSporeling"
  }

}

module.exports = YellowSporeling