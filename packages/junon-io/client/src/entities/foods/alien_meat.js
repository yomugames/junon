const RawFood = require("./raw_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class AlienMeat extends RawFood {

  getSpritePath() {
    return 'alien_meat.png'
  }

  getType() {
    return Protocol.definition().BuildingType.AlienMeat
  }

  getConstantsTable() {
    return "Foods.AlienMeat"
  }

}

module.exports = AlienMeat
