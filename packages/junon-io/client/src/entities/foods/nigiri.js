const BaseFood = require("./base_food")
const Constants = require("../../../../common/constants.json")
const Protocol = require("../../../../common/util/protocol")

class Nigiri extends BaseFood {

  getSpritePath() {
    return 'nigiri.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Nigiri
  }

  getConstantsTable() {
    return "Foods.Nigiri"
  }

}

module.exports = Nigiri
