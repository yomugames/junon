const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const BaseBuilding = require("./base_building")

class UndergroundVent extends BaseBuilding {

  getSpritePath() {
    return "underground_vent.png"
  }

  getType() {
    return Protocol.definition().BuildingType.UndergroundVent
  }

  getConstantsTable() {
    return "Buildings.UndergroundVent"
  }

}

module.exports = UndergroundVent
