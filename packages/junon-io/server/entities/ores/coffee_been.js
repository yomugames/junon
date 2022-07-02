const BaseOre = require("./base_ore")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class CoffeeBean extends BaseOre {
  getConstantsTable() {
    return "Ores.CoffeeBean"
  }

  getType() {
    return Protocol.definition().BuildingType.CoffeeBean
  }
}

module.exports = CoffeeBean
