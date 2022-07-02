const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class SulfurOre extends BaseOre {

  getSpritePath() {
    return 'sulfur_ore.png'
  }

  getType() {
    return Protocol.definition().BuildingType.SulfurOre
  }

  getConstantsTable() {
    return "Ores.SulfurOre"
  }

}

module.exports = SulfurOre
