const BaseBar = require("./base_bar")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class Glass extends BaseBar {
  getConstantsTable() {
    return "Bars.Glass"
  }

  getType() {
    return Protocol.definition().BuildingType.Glass
  }
}

module.exports = Glass
