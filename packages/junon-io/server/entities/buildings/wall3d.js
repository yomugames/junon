const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseWall = require("./base_wall")

class Wall3d extends BaseWall {

  hasCustomColors() {
    return true
  }

  getConstantsTable() {
    return "Walls.Wall3d"
  }

  getType() {
    return Protocol.definition().BuildingType.Wall3d
  }

}

module.exports = Wall3d