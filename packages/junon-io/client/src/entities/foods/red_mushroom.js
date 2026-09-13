const BaseFood = require("./base_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class RedMushroom extends BaseFood {

  getSpritePath() {
    return 'red_mushroom.png'
  }

  getType() {
    return Protocol.definition().BuildingType.RedMushroom
  }

  getConstantsTable() {
    return "Foods.RedMushroom"
  }

}

module.exports = RedMushroom