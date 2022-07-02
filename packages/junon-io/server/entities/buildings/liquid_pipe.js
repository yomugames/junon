const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseDistribution = require("./base_distribution")

class LiquidPipe extends BaseDistribution {

  static isPositionValid(container, x, y, w, h, angle, player) {
    return !this.isOnHangar(container, x, y, w, h) &&
           !container.structureMap.isOccupied(x, y, w, h) &&
           !container[this.prototype.getTileMapName()].isOccupied(x, y, w, h)
  }

  getTileMapName() {
    return "liquidDistributionMap"
  }

  getMapName() {
    return "liquidDistributionMap"
  }

  getConstantsTable() {
    return "Buildings.LiquidPipe"
  }

  getType() {
    return Protocol.definition().BuildingType.LiquidPipe
  }

}

module.exports = LiquidPipe
