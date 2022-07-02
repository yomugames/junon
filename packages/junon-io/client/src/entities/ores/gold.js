const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Gold extends BaseOre {

  getSpritePath() {
    return 'gil.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Gold
  }

  getConstantsTable() {
    return "Ores.Gold"
  }

}

module.exports = Gold
