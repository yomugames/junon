const BaseSeed = require("./base_seed")
const Constants = require("../../../../../common/constants.json")
const Protocol = require("../../../../../common/util/protocol")

class GreenSporeling extends BaseSeed {

  getType() {
    return Protocol.definition().BuildingType.GreenSporeling
  }

  getMatureSpritePath() {
    return "green_mushroom_plant.png"
  }

  getSpritePath() {
    return "green_sporeling.png"
  }

  getConstantsTable() {
    return "Crops.GreenSporeling"
  }

}

module.exports = GreenSporeling