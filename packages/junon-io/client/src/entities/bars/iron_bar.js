const BaseBar = require("./base_bar")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class IronBar extends BaseBar {

  getSpritePath() {
    return 'iron_bar.png'
  }

  getType() {
    return Protocol.definition().BuildingType.IronBar
  }

  getConstantsTable() {
    return "Bars.IronBar"
  }

}

module.exports = IronBar
