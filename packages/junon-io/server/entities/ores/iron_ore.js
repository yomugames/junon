const BaseOre = require("./base_ore")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class IronOre extends BaseOre {
  getConstantsTable() {
    return "Ores.IronOre"
  }

  getType() {
    return Protocol.definition().BuildingType.IronOre
  }
}

module.exports = IronOre
