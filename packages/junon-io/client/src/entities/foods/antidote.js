const BaseFood = require("./base_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Antidote extends BaseFood {

  getSpritePath() {
    return 'antidote.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Antidote
  }

  getConstantsTable() {
    return "Foods.Antidote"
  }

}

module.exports = Antidote
