const BaseOre = require("./base_ore")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class Gold extends BaseOre {
  getConstantsTable() {
    return "Ores.Gold"
  }

  getType() {
    return Protocol.definition().BuildingType.Gold
  }
}

module.exports = Gold
