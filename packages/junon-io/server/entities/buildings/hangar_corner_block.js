const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class HangarCornerBlock extends BaseBuilding {

  static isPositionValid(container, x, y, w, h, angle, player) {
    return !container.armorMap.isOccupied(x, y, w, h) &&
           !this.isOnHangar(container, x, y, w, h) &&
           !container.structureMap.isOccupied(x, y, w, h)
  }

  getConstantsTable() {
    return "Buildings.HangarCornerBlock"
  }

  getType() {
    return Protocol.definition().BuildingType.HangarCornerBlock
  }

}

module.exports = HangarCornerBlock

