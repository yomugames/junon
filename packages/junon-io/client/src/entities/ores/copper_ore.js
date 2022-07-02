const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class CopperOre extends BaseOre {

  getSpritePath() {
    return 'copper_ore.png'
  }

  getType() {
    return Protocol.definition().BuildingType.CopperOre
  }

  getConstantsTable() {
    return "Ores.CopperOre"
  }

}

module.exports = CopperOre
