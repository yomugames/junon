const BaseFood = require("./base_food")
const Constants = require("../../../../common/constants.json")
const Protocol = require("../../../../common/util/protocol")

class PinkMushroom extends BaseFood {

  getSpritePath() {
    return 'pink_mushroom.png'
  }

  getType() {
    return Protocol.definition().BuildingType.PinkMushroom
  }

  getConstantsTable() {
    return "Foods.PinkMushroom"
  }

}

module.exports = PinkMushroom