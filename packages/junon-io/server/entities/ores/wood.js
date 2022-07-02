const BaseOre = require("./base_ore")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class Wood extends BaseOre {
  getConstantsTable() {
    return "Ores.Wood"
  }

  getType() {
    return Protocol.definition().BuildingType.Wood
  }
}

module.exports = Wood
