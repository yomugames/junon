const BaseBuilding = require("./base_building")

class BaseDistribution extends BaseBuilding {

  static isPositionValid(container, x, y, w, h, angle, player) {
    return this.isOnValidPlatform(container, x, y, w, h, angle, player) &&
           !this.isOnHangar(container, x, y, w, h) &&
           !container.structureMap.isOccupied(x, y, w, h) &&
           !container[this.prototype.getMapName()].isOccupied(x, y, w, h)
  }

  replaceExistingTiles() {
    // no need to worry about overlap
  }

  getMap() {
    return this.container.distributionMap
  }

  getGroup() {
    return "distributions"
  }

  getMapName() {
    return "distributionMap"
  }
}

module.exports = BaseDistribution
