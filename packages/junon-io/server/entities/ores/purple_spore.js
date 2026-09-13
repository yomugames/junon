const BaseOre = require("./base_ore")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class PurpleSpore extends BaseOre {
  getConstantsTable() {
    return "Ores.PurpleSpore"
  }

  getType() {
    return Protocol.definition().BuildingType.PurpleSpore
  }
}

module.exports = PurpleSpore