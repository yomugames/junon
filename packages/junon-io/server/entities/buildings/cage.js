const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const Wall = require("./wall")

class Cage extends Wall {
  updateRoom() {
    // dont
  }

  partitionRoom() {
    // dont
  }

  canBeSalvagedBy(player) {
    if (!this.isReachableFromRoom(player.getOccupiedRoom())) {
      return false
    }

    return this.isOwnedBy(player)
  }

  getConstantsTable() {
    return "Buildings.Cage"
  }

  getType() {
    return Protocol.definition().BuildingType.Cage
  }

}

module.exports = Cage
