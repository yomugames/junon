const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class BluePresent extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.BluePresent"
  }

  getType() {
    return Protocol.definition().BuildingType.BluePresent
  }
  
  isCollidable() {
    return false
  }

}

module.exports = BluePresent
