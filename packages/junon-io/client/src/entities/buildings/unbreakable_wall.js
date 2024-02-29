const BaseBuilding = require("./base_building")
const Protocol = require("./../../../../common/util/protocol")

class UnbreakableWall extends BaseBuilding {

  getType() {
    return Protocol.definition().BuildingType.UnbreakableWall
  }

  getConstantsTable() {
    return "Buildings.UnbreakableWall"
  }

  getSpritePath() {
    return 'unbreakable_wall.png'
  }
}

module.exports = UnbreakableWall
