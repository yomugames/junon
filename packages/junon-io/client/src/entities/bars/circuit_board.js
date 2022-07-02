const BaseBar = require("./base_bar")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class CircuitBoard extends BaseBar {

  getSpritePath() {
    return 'circuit_board.png'
  }

  getType() {
    return Protocol.definition().BuildingType.CircuitBoard
  }

  getConstantsTable() {
    return "Bars.CircuitBoard"
  }

}

module.exports = CircuitBoard
