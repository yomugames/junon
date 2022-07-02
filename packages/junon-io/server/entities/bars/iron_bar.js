const BaseBar = require("./base_bar")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class IronBar extends BaseBar {
  getConstantsTable() {
    return "Bars.IronBar"
  }

  getType() {
    return Protocol.definition().BuildingType.IronBar
  }
}

module.exports = IronBar
