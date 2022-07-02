const RawFood = require("./raw_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Wheat extends RawFood {

  getSpritePath() {
    return 'wheat.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Wheat
  }

  getConstantsTable() {
    return "Foods.Wheat"
  }

}

module.exports = Wheat
