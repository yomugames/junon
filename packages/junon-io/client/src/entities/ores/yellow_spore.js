const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class YellowSpore extends BaseOre {

  getSpritePath() {
    return 'yellow_spore.png'
  }

  getType() {
    return Protocol.definition().BuildingType.YellowSpore
  }

  getConstantsTable() {
    return "Ores.YellowSpore"
  }

}

module.exports = YellowSpore