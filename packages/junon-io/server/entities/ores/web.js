const BaseOre = require("./base_ore")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class Web extends BaseOre {
  getConstantsTable() {
    return "Ores.Web"
  }

  getType() {
    return Protocol.definition().BuildingType.Web
  }
}

module.exports = Web
