const BaseUnderground = require("./base_underground")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Oil extends BaseUnderground {

  getSpritePath() {
    return 'black.png'
  }

  getType() {
    return Protocol.definition().TerrainType.Oil
  }

  getConstantsTable() {
    return "Terrains.Oil"
  }

}

module.exports = Oil
