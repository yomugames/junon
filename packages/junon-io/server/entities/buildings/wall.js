const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseWall = require("./base_wall")

class Wall extends BaseWall {

  hasCustomColors() {
    return true
  }

  getConstantsTable() {
    return "Walls.Wall"
  }

  getType() {
    return Protocol.definition().BuildingType.Wall
  }

}

module.exports = Wall
