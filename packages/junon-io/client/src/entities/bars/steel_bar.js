const BaseBar = require("./base_bar")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class SteelBar extends BaseBar {

  getSpritePath() {
    return 'steel_bar.png'
  }

  getType() {
    return Protocol.definition().BuildingType.SteelBar
  }

  getConstantsTable() {
    return "Bars.SteelBar"
  }

}

module.exports = SteelBar
