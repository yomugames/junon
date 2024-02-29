const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require('./base_building')

class UnbreakableWall extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.UnbreakableWall"
  }

  canBeSalvagedBy(player) {
    if(player.isSectorOwner()) return true
    return false
  }

  getType() {
    return Protocol.definition().BuildingType.UnbreakableWall
  }
}

module.exports = UnbreakableWall
