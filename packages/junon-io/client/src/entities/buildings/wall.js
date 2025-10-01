const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const BaseWall = require("./base_wall")

class Wall extends BaseWall {

  getType() {
    return Protocol.definition().BuildingType.Wall
  }

  getConstantsTable() {
    return "Walls.Wall"
  }

  getWallColor() {
    return 0x2a2a2a  
  }

}

module.exports = Wall
