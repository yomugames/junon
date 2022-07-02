const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Meteorite extends BaseOre {

  getSpritePath() {
    return 'meteorite.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Meteorite
  }

  getConstantsTable() {
    return "Ores.Meteorite"
  }

}

module.exports = Meteorite
