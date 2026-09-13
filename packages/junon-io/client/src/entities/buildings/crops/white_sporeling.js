const BaseSeed = require("./base_seed")
const Constants = require("../../../../../common/constants.json")
const Protocol = require("../../../../../common/util/protocol")

class WhiteSporeling extends BaseSeed {

  getType() {
    return Protocol.definition().BuildingType.WhiteSporeling
  }

  getMatureSpritePath() {
    return "white_mushroom_plant.png"
  }

  getSpritePath() {
    return "white_sporeling.png"
  }

  getConstantsTable() {
    return "Crops.WhiteSporeling"
  }

}

module.exports = WhiteSporeling
