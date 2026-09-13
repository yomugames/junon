const BaseFood = require("./base_food")
const Constants = require("../../../../common/constants.json")
const Protocol = require("../../../../common/util/protocol")

class YellowMushroom extends BaseFood {

  getSpritePath() {
    return 'yellow_mushroom.png'
  }

  getType() {
    return Protocol.definition().BuildingType.YellowMushroom
  }

  getConstantsTable() {
    return "Foods.YellowMushroom"
  }

}

module.exports = YellowMushroom