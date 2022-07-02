const BaseFood = require("./base_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class VeganPizza extends BaseFood {

  getSpritePath() {
    return 'vegan_pizza.png'
  }

  getType() {
    return Protocol.definition().BuildingType.VeganPizza
  }

  getConstantsTable() {
    return "Foods.VeganPizza"
  }

}

module.exports = VeganPizza
