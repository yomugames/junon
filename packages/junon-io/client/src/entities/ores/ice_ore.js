const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class IceOre extends BaseOre {

  getSpritePath() {
    return 'ice_ore.png'
  }

  getType() {
    return Protocol.definition().BuildingType.IceOre
  }

  getConstantsTable() {
    return "Ores.IceOre"
  }

}

module.exports = IceOre
