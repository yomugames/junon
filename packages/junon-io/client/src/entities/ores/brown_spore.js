const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class BrownSpore extends BaseOre {

  getSpritePath() {
    return 'brown_spore.png'
  }

  getType() {
    return Protocol.definition().BuildingType.BrownSpore
  }

  getConstantsTable() {
    return "Ores.BrownSpore"
  }

}

module.exports = BrownSpore
