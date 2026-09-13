const BaseFood = require("./base_food")
const Constants = require("../../../../common/constants.json")
const Protocol = require("../../../../common/util/protocol")

class BrownMushroom extends BaseFood {

  getSpritePath() {
    return 'brown_mushroom.png'
  }

  getType() {
    return Protocol.definition().BuildingType.BrownMushroom
  }

  getConstantsTable() {
    return "Foods.BrownMushroom"
  }

}

module.exports = BrownMushroom