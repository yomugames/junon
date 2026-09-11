const BaseOre = require("./base_ore")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class BlueSpore extends BaseOre {
  getConstantsTable() {
    return "Ores.BlueSpore"
  }

  getType() {
    return Protocol.definition().BuildingType.BlueSpore
  }
}

module.exports = BlueSpore