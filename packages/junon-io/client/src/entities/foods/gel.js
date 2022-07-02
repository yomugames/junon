const RawFood = require("./raw_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Gel extends RawFood {

  getSpritePath() {
    return 'gel.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Gel
  }

  getConstantsTable() {
    return "Foods.Gel"
  }

}

module.exports = Gel
