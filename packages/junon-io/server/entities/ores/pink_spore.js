const BaseOre = require("./base_ore")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class PinkSpore extends BaseOre {
  getConstantsTable() {
    return "Ores.PinkSpore"
  }

  getType() {
    return Protocol.definition().BuildingType.PinkSpore
  }
}

module.exports = PinkSpore