const BaseOre = require("./base_ore")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class Meteorite extends BaseOre {
  getConstantsTable() {
    return "Ores.Meteorite"
  }

  getType() {
    return Protocol.definition().BuildingType.Meteorite
  }
}

module.exports = Meteorite
