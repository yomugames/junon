const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class GreenPresent extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.GreenPresent"
  }

  getType() {
    return Protocol.definition().BuildingType.GreenPresent
  }
  
  isCollidable() {
    return false
  }

}

module.exports = GreenPresent
