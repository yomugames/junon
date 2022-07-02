const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class ShieldGenerator extends BaseBuilding {

  getSpritePath() {
    return 'shield_generator.png'
  }

  getType() {
    return Protocol.definition().BuildingType.ShieldGenerator
  }

  getConstantsTable() {
    return "Buildings.ShieldGenerator"
  }

}

module.exports = ShieldGenerator
