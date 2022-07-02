const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Cloth extends BaseOre {

  getSpritePath() {
    return 'cloth.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Cloth
  }

  getConstantsTable() {
    return "Ores.Cloth"
  }

}

module.exports = Cloth
