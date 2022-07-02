const BaseFood = require("./base_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class SlimyMeatPizza extends BaseFood {

  getSpritePath() {
    return 'slimy_meat_pizza.png'
  }

  getType() {
    return Protocol.definition().BuildingType.SlimyMeatPizza
  }

  getConstantsTable() {
    return "Foods.SlimyMeatPizza"
  }

}

module.exports = SlimyMeatPizza
