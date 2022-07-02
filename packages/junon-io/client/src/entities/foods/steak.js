const BaseFood = require("./base_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Steak extends BaseFood {

  getSpritePath() {
    return 'steak.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Steak
  }

  getConstantsTable() {
    return "Foods.Steak"
  }

}

module.exports = Steak
