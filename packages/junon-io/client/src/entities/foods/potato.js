const BaseFood = require("./base_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Potato extends BaseFood {

  getSpritePath() {
    return 'potato.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Potato
  }

  getConstantsTable() {
    return "Foods.Potato"
  }

}

module.exports = Potato
