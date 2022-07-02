const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class Fence extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.Fence"
  }

  getType() {
    return Protocol.definition().BuildingType.Fence
  }

  shouldObstruct(body) {
    if (body.entity.isPlayer()) return false
    return true
  }


}

module.exports = Fence
