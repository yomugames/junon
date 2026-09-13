const BaseFood = require("./base_food")
const Constants = require("../../../../common/constants.json")
const Protocol = require("../../../../common/util/protocol")

class OrangeMushroom extends BaseFood {

  getSpritePath() {
    return 'orange_mushroom.png'
  }

  getType() {
    return Protocol.definition().BuildingType.OrangeMushroom
  }

  getConstantsTable() {
    return "Foods.OrangeMushroom"
  }

}

module.exports = OrangeMushroom