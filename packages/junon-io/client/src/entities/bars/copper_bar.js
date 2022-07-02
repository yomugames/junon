const BaseBar = require("./base_bar")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class CopperBar extends BaseBar {

  getSpritePath() {
    return 'copper_bar.png'
  }

  getType() {
    return Protocol.definition().BuildingType.CopperBar
  }

  getConstantsTable() {
    return "Bars.CopperBar"
  }

}

module.exports = CopperBar
