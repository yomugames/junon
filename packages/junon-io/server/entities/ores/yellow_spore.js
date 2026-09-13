const BaseOre = require("./base_ore")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class YellowSpore extends BaseOre {
  getConstantsTable() {
    return "Ores.YellowSpore"
  }

  getType() {
    return Protocol.definition().BuildingType.YellowSpore
  }
}

module.exports = YellowSpore