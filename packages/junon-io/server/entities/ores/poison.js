const BaseOre = require("./base_ore")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class Poison extends BaseOre {
  getConstantsTable() {
    return "Ores.Poison"
  }

  getType() {
    return Protocol.definition().BuildingType.Poison
  }
}

module.exports = Poison
