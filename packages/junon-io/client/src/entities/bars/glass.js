const BaseBar = require("./base_bar")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Glass extends BaseBar {

  getSpritePath() {
    return 'glass.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Glass
  }

  getConstantsTable() {
    return "Bars.Glass"
  }

}

module.exports = Glass
