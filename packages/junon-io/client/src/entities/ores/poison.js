const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Poison extends BaseOre {

  getSpritePath() {
    return 'poison.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Poison
  }

  getConstantsTable() {
    return "Ores.Poison"
  }

}

module.exports = Poison
