const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class CoffeeBean extends BaseOre {

  getSpritePath() {
    return 'coffee_bean.png'
  }

  getType() {
    return Protocol.definition().BuildingType.CoffeeBean
  }

  getConstantsTable() {
    return "Ores.CoffeeBean"
  }

}

module.exports = CoffeeBean
