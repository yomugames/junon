const BaseFloor = require("./base_floor")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")


class SteelFloor extends BaseFloor {

  getBaseSpritePath() {
    return 'platform_chromeless_plated.png'
  }

  getEdgeSpritePath() {
    return 'platform_edge.png'
  }

  getType() {
    return Protocol.definition().BuildingType.SteelFloor
  }

  getConstantsTable() {
    return "Floors.SteelFloor"
  }

}

module.exports = SteelFloor
