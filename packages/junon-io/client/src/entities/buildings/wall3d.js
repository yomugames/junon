const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const BaseWall = require("./base_wall")

class Wall3d extends BaseWall {

  getType() {
    return Protocol.definition().BuildingType.Wall3d
  }

  getConstantsTable() {
    return "Walls.Wall3d"
  }

  getWallColor() {
    return 0x2a2a2a
  }

}

module.exports = Wall3d

