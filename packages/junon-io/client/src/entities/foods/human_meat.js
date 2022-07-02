const RawFood = require("./raw_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class HumanMeat extends RawFood {

  getSpritePath() {
    return 'human_meat.png'
  }

  getType() {
    return Protocol.definition().BuildingType.HumanMeat
  }

  getConstantsTable() {
    return "Foods.HumanMeat"
  }

}

module.exports = HumanMeat
