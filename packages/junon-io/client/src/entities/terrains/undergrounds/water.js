const BaseUnderground = require("./base_underground")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Water extends BaseUnderground {

  getSpritePath() {
    return 'water.png'
  }

  getType() {
    return Protocol.definition().TerrainType.Water
  }

  getConstantsTable() {
    return "Terrains.Water"
  }


}

module.exports = Water
