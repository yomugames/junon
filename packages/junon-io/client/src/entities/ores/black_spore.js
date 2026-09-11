const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class BlackSpore extends BaseOre {

  getSpritePath() {
    return 'black_spore.png'
  }

  getType() {
    return Protocol.definition().BuildingType.BlackSpore
  }

  getConstantsTable() {
    return "Ores.BlackSpore"
  }

}

module.exports = BlackSpore