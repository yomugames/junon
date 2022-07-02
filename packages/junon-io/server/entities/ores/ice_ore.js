const BaseOre = require("./base_ore")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class IceOre extends BaseOre {
  getConstantsTable() {
    return "Ores.IceOre"
  }

  getType() {
    return Protocol.definition().BuildingType.IceOre
  }
}

module.exports = IceOre
