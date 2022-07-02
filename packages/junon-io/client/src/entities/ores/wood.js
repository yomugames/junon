const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Wood extends BaseOre {

  getSpritePath() {
    return 'wood.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Wood
  }

  getConstantsTable() {
    return "Ores.Wood"
  }

}

module.exports = Wood
