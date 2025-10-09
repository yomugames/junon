const BaseFood = require("./base_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Cabbage extends BaseFood {

  getSpritePath() {
    return 'cabbage.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Cabbage
  }

  getConstantsTable() {
    return "Foods.Cabbage"
  }

}

module.exports = Cabbage