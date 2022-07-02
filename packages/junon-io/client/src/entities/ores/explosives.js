const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Explosives extends BaseOre {

  getSpritePath() {
    return 'explosives.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Explosives
  }

  getConstantsTable() {
    return "Ores.Explosives"
  }

}

module.exports = Explosives
