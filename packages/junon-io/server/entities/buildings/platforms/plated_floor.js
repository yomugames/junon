const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')
const SteelFloor = require("./steel_floor")

class PlatedFloor extends SteelFloor {

  getConstantsTable() {
    return "Floors.PlatedFloor"
  }

  getType() {
    return Protocol.definition().BuildingType.PlatedFloor
  }

}

module.exports = PlatedFloor
