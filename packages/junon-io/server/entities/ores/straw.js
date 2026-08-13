const BaseOre = require("./base_ore")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class Straw extends BaseOre {
  getConstantsTable() {
    return "Ores.Straw"
  }

  getType() {
    return Protocol.definition().BuildingType.Straw
  }
}

module.exports = Straw
