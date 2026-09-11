const BaseOre = require("./base_ore")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class RedSpore extends BaseOre {
  getConstantsTable() {
    return "Ores.RedSpore"
  }

  getType() {
    return Protocol.definition().BuildingType.RedSpore
  }
}

module.exports = RedSpore
