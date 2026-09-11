const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class RedSpore extends BaseOre {

  getSpritePath() {
    return 'red_spore.png'
  }

  getType() {
    return Protocol.definition().BuildingType.RedSpore
  }

  getConstantsTable() {
    return "Ores.RedSpore"
  }

}

module.exports = RedSpore
