const BaseFood = require("./base_food")

const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Starnut extends BaseFood {

  getSpritePath() {
    return 'strangenut.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Starnut
  }

  getConstantsTable() {
    return "Foods.Starnut"
  }

}

module.exports = Starnut
