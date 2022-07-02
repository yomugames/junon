const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')
const BaseFloor = require("./base_floor")

class Lattice extends BaseFloor {

  static isPositionValid(container, x, y, w, h, angle, player, type) {
    if (container.groundMap.isOccupied(x, y, w, h)) return false
    return super.isPositionValid(container, x, y, w, h, angle, player, type)
  }

  getConstantsTable() {
    return "Floors.Lattice"
  }

  getType() {
    return Protocol.definition().BuildingType.Lattice
  }

}

module.exports = Lattice
