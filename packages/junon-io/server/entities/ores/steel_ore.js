const BaseOre = require("./base_ore")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class SteelOre extends BaseOre {
  getConstantsTable() {
    return "Ores.SteelOre"
  }

  getType() {
    return Protocol.definition().BuildingType.SteelOre
  }
}

module.exports = SteelOre
