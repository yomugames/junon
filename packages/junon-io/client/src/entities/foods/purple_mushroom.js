const BaseFood = require("./base_food")
const Constants = require("../../../../common/constants.json")
const Protocol = require("../../../../common/util/protocol")

class PurpleMushroom extends BaseFood {

  getSpritePath() {
    return 'purple_mushroom.png'
  }

  getType() {
    return Protocol.definition().BuildingType.PurpleMushroom
  }

  getConstantsTable() {
    return "Foods.PurpleMushroom"
  }

}

module.exports = PurpleMushroom