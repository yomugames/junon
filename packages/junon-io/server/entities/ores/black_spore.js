const BaseOre = require("./base_ore")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class BlackSpore extends BaseOre {
  getConstantsTable() {
    return "Ores.BlackSpore"
  }

  getType() {
    return Protocol.definition().BuildingType.BlackSpore
  }
}

module.exports = BlackSpore