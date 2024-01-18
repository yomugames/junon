const BaseFood = require("./base_food")

const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Starnut extends BaseFood {
  
  getType() {
    return Protocol.definition().BuildingType.Starnut
  }

  getConstantsTable() {
    return "Foods.Starnut"
  }

}

module.exports = Starnut
