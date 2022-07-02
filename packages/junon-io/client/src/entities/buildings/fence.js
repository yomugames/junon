const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Fence extends BaseBuilding {

  getSpritePath() {
    return 'fence.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Fence
  }

  getConstantsTable() {
    return "Buildings.Fence"
  }

}

module.exports = Fence
