const BaseFood = require("./base_food")
const Constants = require("../../../../common/constants.json")
const Protocol = require("../../../../common/util/protocol")

class BlackMushroom extends BaseFood {

  getSpritePath() {
    return 'black_mushroom.png'
  }

  getType() {
    return Protocol.definition().BuildingType.BlackMushroom
  }

  getConstantsTable() {
    return "Foods.BlackMushroom"
  }

}

module.exports = BlackMushroom