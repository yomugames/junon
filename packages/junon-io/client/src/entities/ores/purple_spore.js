const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class PurpleSpore extends BaseOre {

  getSpritePath() {
    return 'purple_spore.png'
  }

  getType() {
    return Protocol.definition().BuildingType.PurpleSpore
  }

  getConstantsTable() {
    return "Ores.PurpleSpore"
  }

}

module.exports = PurpleSpore