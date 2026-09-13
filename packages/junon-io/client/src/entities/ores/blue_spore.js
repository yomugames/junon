const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class BlueSpore extends BaseOre {

  getSpritePath() {
    return 'blue_spore.png'
  }

  getType() {
    return Protocol.definition().BuildingType.BlueSpore
  }

  getConstantsTable() {
    return "Ores.BlueSpore"
  }

}

module.exports = BlueSpore