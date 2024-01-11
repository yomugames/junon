const BaseFood = require("./base_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Fish extends BaseFood {

  getSpritePath() {
    return 'fish.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Fish
  }

  getConstantsTable() {
    return "Foods.Fish"
  }

}

module.exports = Fish