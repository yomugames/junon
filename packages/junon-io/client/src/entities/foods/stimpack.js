const BaseFood = require("./base_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Stimpack extends BaseFood {

  getSpritePath() {
    return 'stimpack.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Stimpack
  }

  getConstantsTable() {
    return "Foods.Stimpack"
  }

}

module.exports = Stimpack
