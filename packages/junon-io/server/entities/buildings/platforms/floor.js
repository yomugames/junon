const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')
const BaseFloor = require("./base_floor")

class Floor extends BaseFloor {

  getConstantsTable() {
    return "Floors.Floor"
  }

  getType() {
    return Protocol.definition().BuildingType.Floor
  }

  hasCustomColors() {
    return true
  }

}

module.exports = Floor
