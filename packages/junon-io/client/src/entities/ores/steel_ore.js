const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class SteelOre extends BaseOre {

  getSpritePath() {
    return 'steel_ore.png'
  }

  getType() {
    return Protocol.definition().BuildingType.SteelOre
  }

  getConstantsTable() {
    return "Ores.SteelOre"
  }

}

module.exports = SteelOre
