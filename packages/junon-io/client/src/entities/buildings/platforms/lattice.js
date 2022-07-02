const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")
const BaseFloor = require("./base_floor")

class Lattice extends BaseFloor {

  static isPositionValid(container, x, y, w, h, angle, player, type) {
    if (container.groundMap.isOccupied(x, y, w, h)) return false

    return super.isPositionValid(container, x, y, w, h, angle, player, type)
  }

  getBaseSpritePath() {
    return 'lattice.png'
  }

  getEdgeSpritePath() {
    return ''
  }

  getType() {
    return Protocol.definition().BuildingType.Lattice
  }

  getConstantsTable() {
    return "Floors.Lattice"
  }

}

module.exports = Lattice
