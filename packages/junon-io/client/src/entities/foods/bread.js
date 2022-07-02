const BaseFood = require("./base_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Bread extends BaseFood {

  getSpritePath() {
    return 'bread.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Bread
  }

  getConstantsTable() {
    return "Foods.Bread"
  }

}

module.exports = Bread
