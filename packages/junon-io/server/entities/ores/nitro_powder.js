const BaseOre = require("./base_ore")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class NitroPowder extends BaseOre {
  getConstantsTable() {
    return "Ores.NitroPowder"
  }

  getType() {
    return Protocol.definition().BuildingType.NitroPowder
  }
}

module.exports = NitroPowder
