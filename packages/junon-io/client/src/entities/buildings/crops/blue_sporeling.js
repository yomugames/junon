const BaseSeed = require("./base_seed")
const Constants = require("../../../../../common/constants.json")
const Protocol = require("../../../../../common/util/protocol")

class BlueSporeling extends BaseSeed {

  getType() {
    return Protocol.definition().BuildingType.BlueSporeling
  }

  getMatureSpritePath() {
    return "blue_mushroom_plant.png"
  }

  getSpritePath() {
    return "blue_sporeling.png"
  }

  getConstantsTable() {
    return "Crops.BlueSporeling"
  }

}

module.exports = BlueSporeling