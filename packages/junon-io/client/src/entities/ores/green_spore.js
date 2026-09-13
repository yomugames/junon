const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class GreenSpore extends BaseOre {

  getSpritePath() {
    return 'green_spore.png'
  }

  getType() {
    return Protocol.definition().BuildingType.GreenSpore
  }

  getConstantsTable() {
    return "Ores.GreenSpore"
  }

}

module.exports = GreenSpore