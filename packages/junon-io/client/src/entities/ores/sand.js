const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Sand extends BaseOre {

  getSpritePath() {
    return 'sand.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Sand
  }

  getConstantsTable() {
    return "Ores.Sand"
  }

}

module.exports = Sand
