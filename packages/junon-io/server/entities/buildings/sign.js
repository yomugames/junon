const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class Sign extends BaseBuilding {

  setHealth(newHealth) {
    if (this.game.isPvP()) return super.setHealth(newHealth)

    // cannot be damaged in non-pvp
  }

  getConstantsTable() {
    return "Buildings.Sign"
  }

  getType() {
    return Protocol.definition().BuildingType.Sign
  }
  
  isCollidable() {
    return false
  }

}

module.exports = Sign
