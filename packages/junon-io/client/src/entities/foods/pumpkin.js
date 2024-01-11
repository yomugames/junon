const BaseFood = require("./base_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Pumpkin extends BaseFood {

  getSpritePath() {
    return 'pumpkin.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Pumpkin
  }

  getConstantsTable() {
    return "Foods.Pumpkin"
  }

}

module.exports = Pumpkin
