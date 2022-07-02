const BaseFood = require("./base_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Fries extends BaseFood {

  getSpritePath() {
    return 'fries.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Fries
  }

  getConstantsTable() {
    return "Foods.Fries"
  }

}

module.exports = Fries
