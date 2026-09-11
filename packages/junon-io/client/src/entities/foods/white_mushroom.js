const BaseFood = require("./base_food")
const Constants = require("../../../../common/constants.json")
const Protocol = require("../../../../common/util/protocol")

class WhiteMushroom extends BaseFood {

  getSpritePath() {
    return 'white_mushroom.png'
  }

  getType() {
    return Protocol.definition().BuildingType.WhiteMushroom
  }

  getConstantsTable() {
    return "Foods.WhiteMushroom"
  }

}

module.exports = WhiteMushroom