const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class HangarCornerBlock extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  static isPositionValid(container, x, y, w, h, angle, player) {
    return !container.armorMap.isOccupied(x, y, w, h) &&
           this.isWithinInteractDistance(x, y, player) &&
           !this.isOnHangar(container, x, y, w, h) &&
           !container.structureMap.isOccupied(x, y, w, h)
  }

  getType() {
    return Protocol.definition().BuildingType.HangarCornerBlock
  }

  getSpritePath() {
    return "hangar_corner_block.png"
  }

  getConstantsTable() {
    return "Buildings.HangarCornerBlock"
  }

}

module.exports = HangarCornerBlock
