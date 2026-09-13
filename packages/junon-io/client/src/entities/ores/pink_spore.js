const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class PinkSpore extends BaseOre {

  getSpritePath() {
    return 'pink_spore.png'
  }

  getType() {
    return Protocol.definition().BuildingType.PinkSpore
  }

  getConstantsTable() {
    return "Ores.PinkSpore"
  }

}

module.exports = PinkSpore