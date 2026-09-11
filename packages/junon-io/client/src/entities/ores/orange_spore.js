const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class OrangeSpore extends BaseOre {

  getSpritePath() {
    return 'orange_spore.png'
  }

  getType() {
    return Protocol.definition().BuildingType.OrangeSpore
  }

  getConstantsTable() {
    return "Ores.OrangeSpore"
  }

}

module.exports = OrangeSpore