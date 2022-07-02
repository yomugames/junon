const BaseOre = require("./base_ore")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Web extends BaseOre {

  getSpritePath() {
    return 'web.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Web
  }

  getConstantsTable() {
    return "Ores.Web"
  }

}

module.exports = Web
