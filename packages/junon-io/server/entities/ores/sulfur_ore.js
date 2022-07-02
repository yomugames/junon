const BaseOre = require("./base_ore")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class SulfurOre extends BaseOre {
  getConstantsTable() {
    return "Ores.SulfurOre"
  }

  getType() {
    return Protocol.definition().BuildingType.SulfurOre
  }
}

module.exports = SulfurOre
