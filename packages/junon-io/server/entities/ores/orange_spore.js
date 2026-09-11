const BaseOre = require("./base_ore")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class OrangeSpore extends BaseOre {
  getConstantsTable() {
    return "Ores.OrangeSpore"
  }

  getType() {
    return Protocol.definition().BuildingType.OrangeSpore
  }
}

module.exports = OrangeSpore