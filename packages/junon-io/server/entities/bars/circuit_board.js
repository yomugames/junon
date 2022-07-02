const BaseBar = require("./base_bar")
const Constants = require("./../../../common/constants.json")
const Protocol = require('../../../common/util/protocol')

class CircuitBoard extends BaseBar {
  getConstantsTable() {
    return "Bars.CircuitBoard"
  }

  getType() {
    return Protocol.definition().BuildingType.CircuitBoard
  }
}

module.exports = CircuitBoard
