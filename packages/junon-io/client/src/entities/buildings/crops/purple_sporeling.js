const BaseSeed = require("./base_seed")
const Constants = require("../../../../../common/constants.json")
const Protocol = require("../../../../../common/util/protocol")

class PurpleSporeling extends BaseSeed {

  getType() {
    return Protocol.definition().BuildingType.PurpleSporeling
  }

  getMatureSpritePath() {
    return "purple_mushroom_plant.png"
  }

  getSpritePath() {
    return "purple_sporeling.png"
  }

  getConstantsTable() {
    return "Crops.PurpleSporeling"
  }

}

module.exports = PurpleSporeling