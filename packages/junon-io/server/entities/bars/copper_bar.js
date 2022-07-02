const BaseBar = require("./base_bar")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class CopperBar extends BaseBar {
  getConstantsTable() {
    return "Bars.CopperBar"
  }

  getType() {
    return Protocol.definition().BuildingType.CopperBar
  }
}

module.exports = CopperBar
