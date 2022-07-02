const BaseOre = require("./base_ore")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class Explosives extends BaseOre {
  getConstantsTable() {
    return "Ores.Explosives"
  }

  getType() {
    return Protocol.definition().BuildingType.Explosives
  }
}

module.exports = Explosives
