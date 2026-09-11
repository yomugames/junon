const BaseFood = require("./base_food")
const Constants = require("../../../../common/constants.json")
const Protocol = require("../../../../common/util/protocol")

class BlueMushroom extends BaseFood {

  getSpritePath() {
    return 'blue_mushroom.png'
  }

  getType() {
    return Protocol.definition().BuildingType.BlueMushroom
  }

  getConstantsTable() {
    return "Foods.BlueMushroom"
  }

}

module.exports = BlueMushroom