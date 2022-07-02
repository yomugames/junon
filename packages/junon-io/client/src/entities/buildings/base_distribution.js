const BaseBuilding = require("./base_building")
const Constants = require("../../../../common/constants.json")

class BaseDistribution extends BaseBuilding {

  static isPositionValid(container, x, y, w, h, angle, player) {
    return this.isOnValidPlatform(container, x, y, w, h, angle, player) &&
           this.isWithinInteractDistance(x, y, player) &&
           !this.isOnHangar(container, x, y, w, h) &&
           !container.structureMap.isOccupied(x, y, w, h) &&
           !container.distributionMap.isOccupied(x, y, w, h)
  }

  getDisplayWidth() {
    return Constants.tileSize
  }

  getDisplayHeight() {
    return Constants.tileSize
  }

  getRotatedWidth() {
    return Constants.tileSize
  }

  getRotatedHeight() {
    return Constants.tileSize
  }

  getGroup() {
    return "distributions"
  }

  getMap() {
    return this.container.distributionMap
  }

}

module.exports = BaseDistribution
