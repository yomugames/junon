const BaseFood = require("./base_food")
const Constants = require("../../../../common/constants.json")
const Protocol = require("../../../../common/util/protocol")

class GreenMushroom extends BaseFood {

  getSpritePath() {
    return 'green_mushroom.png'
  }

  getType() {
    return Protocol.definition().BuildingType.GreenMushroom
  }

  getConstantsTable() {
    return "Foods.GreenMushroom"
  }

}

module.exports = GreenMushroom