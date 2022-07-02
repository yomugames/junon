const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class IronOre extends BaseOre {

  getSpritePath() {
    return 'iron_ore.png'
  }

  getType() {
    return Protocol.definition().BuildingType.IronOre
  }

  getConstantsTable() {
    return "Ores.IronOre"
  }

}

module.exports = IronOre
