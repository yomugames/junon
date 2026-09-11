const BaseSeed = require("./base_seed")
const Constants = require("../../../../../common/constants.json")
const Protocol = require("../../../../../common/util/protocol")

class RedSporeling extends BaseSeed {

  getType() {
    return Protocol.definition().BuildingType.RedSporeling
  }

  getMatureSpritePath() {
    return "red_mushroom_plant.png"
  }

  getSpritePath() {
    return "red_sporeling.png"
  }

  getConstantsTable() {
    return "Crops.RedSporeling"
  }

}

module.exports = RedSporeling
