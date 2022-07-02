const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class NitroPowder extends BaseOre {

  getSpritePath() {
    return 'nitro_powder.png'
  }

  getType() {
    return Protocol.definition().BuildingType.NitroPowder
  }

  getConstantsTable() {
    return "Ores.NitroPowder"
  }

}

module.exports = NitroPowder
