const RawFood = require("./raw_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Rice extends RawFood {

  getSpritePath() {
    return 'rice.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Rice
  }

  getConstantsTable() {
    return "Foods.Rice"
  }

}

module.exports = Rice
