const BaseSeed = require("./base_seed")
const Constants = require("../../../../../common/constants.json")
const Protocol = require("../../../../../common/util/protocol")

class OrangeSporeling extends BaseSeed {

  getType() {
    return Protocol.definition().BuildingType.OrangeSporeling
  }

  getMatureSpritePath() {
    return "orange_mushroom_plant.png"
  }

  getSpritePath() {
    return "orange_sporeling.png"
  }

  getConstantsTable() {
    return "Crops.OrangeSporeling"
  }

}

module.exports = OrangeSporeling