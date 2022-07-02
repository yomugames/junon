const BaseOre = require("./base_ore")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class Cloth extends BaseOre {
  getConstantsTable() {
    return "Ores.Cloth"
  }

  getType() {
    return Protocol.definition().BuildingType.Cloth
  }
}

module.exports = Cloth
