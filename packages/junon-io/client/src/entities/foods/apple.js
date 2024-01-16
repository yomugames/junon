const BaseFood = require("./base_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Apple extends BaseFood {

  getSpritePath() {
    return 'Apple.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Apple
  }

  getConstantsTable() {
    return "Foods.Apple"
  }

}

module.exports = Apple
