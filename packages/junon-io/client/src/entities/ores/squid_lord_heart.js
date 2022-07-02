const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class SquidLordHeart extends BaseOre {

  getSpritePath() {
    return 'squid_lord_heart.png'
  }

  getType() {
    return Protocol.definition().BuildingType.SquidLordHeart
  }

  getConstantsTable() {
    return "Ores.SquidLordHeart"
  }

}

module.exports = SquidLordHeart
