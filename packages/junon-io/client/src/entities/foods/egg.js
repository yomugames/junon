const BaseFood = require("./base_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Egg extends BaseFood {

  getSpritePath() {
    return 'egg.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Egg
  }

  getConstantsTable() {
    return "Foods.Egg"
  }

}

module.exports = Egg
