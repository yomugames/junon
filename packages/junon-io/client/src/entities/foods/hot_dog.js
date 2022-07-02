const BaseFood = require("./base_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class HotDog extends BaseFood {

  getSpritePath() {
    return 'hotdog.png'
  }

  getType() {
    return Protocol.definition().BuildingType.HotDog
  }

  getConstantsTable() {
    return "Foods.HotDog"
  }

}

module.exports = HotDog
