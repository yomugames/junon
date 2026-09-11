const BaseOre = require("./base_ore")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class BrownSpore extends BaseOre {
  getConstantsTable() {
    return "Ores.BrownSpore"
  }

  getType() {
    return Protocol.definition().BuildingType.BrownSpore
  }
}

module.exports = BrownSpore
