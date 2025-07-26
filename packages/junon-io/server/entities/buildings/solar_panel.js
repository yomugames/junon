const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class SolarPanel extends BaseBuilding {

  static isOnValidPlatform(container, x, y, w, h, angle, player) {
    if(!super.isOnValidPlatform(container, x, y, w, h, angle, player)) return false; // base class prevents placing on negative coordinates

    if (this.isPlacingOnSomeoneElsePlatform(container, x, y, w, h, angle, player)) return false

    let box = this.getBox(x, y, w, h)
    let hasLattice = container.platformMap.hitTestTile(box).every((hit) => {
      return hit.entity && hit.entity.getType() === Protocol.definition().BuildingType.Lattice
    })

    return hasLattice
  }

  getConstantsTable() {
    return "Buildings.SolarPanel"
  }

  getType() {
    return Protocol.definition().BuildingType.SolarPanel
  }

}

module.exports = SolarPanel

