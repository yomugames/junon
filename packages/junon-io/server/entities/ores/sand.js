const BaseOre = require("./base_ore")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class Sand extends BaseOre {
  getConstantsTable() {
    return "Ores.Sand"
  }

  getType() {
    return Protocol.definition().BuildingType.Sand
  }
}

module.exports = Sand
