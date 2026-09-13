const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class WhiteSpore extends BaseOre {

  getSpritePath() {
    return 'white_spore.png'
  }

  getType() {
    return Protocol.definition().BuildingType.WhiteSpore
  }

  getConstantsTable() {
    return "Ores.WhiteSpore"
  }

}

module.exports = WhiteSpore
