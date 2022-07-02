const BaseOre = require("./base_ore")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class SquidLordHeart extends BaseOre {
  getConstantsTable() {
    return "Ores.SquidLordHeart"
  }

  getType() {
    return Protocol.definition().BuildingType.SquidLordHeart
  }
}

module.exports = SquidLordHeart
