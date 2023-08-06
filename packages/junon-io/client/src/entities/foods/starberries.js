const BaseFood = require("./base_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Starberries extends BaseFood {

  getSpritePath() {
    return 'starberries.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Starberries
  }

  getConstantsTable() {
    return "Foods.Starberries"
  }

}

module.exports = Starberries
