const BaseFood = require("./base_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Omelette extends BaseFood {

  getSpritePath() {
    return 'omelette.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Omelette
  }

  getConstantsTable() {
    return "Foods.Omelette"
  }

}

module.exports = Omelette
