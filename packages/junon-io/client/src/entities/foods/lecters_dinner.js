const BaseFood = require("./base_food")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class LectersDinner extends BaseFood {

  getSpritePath() {
    return 'lecters_dinner.png'
  }

  getType() {
    return Protocol.definition().BuildingType.LectersDinner
  }

  getConstantsTable() {
    return "Foods.LectersDinner"
  }

}

module.exports = LectersDinner
