const BaseBuilding = require("./base_building")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Ventilator extends BaseBuilding {

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  static isPositionValid(container, x, y, w, h, angle, player) {
    let relativeBox = this.getBox(x, y, w, h)
    let armorHits = container.armorMap.hitTestTile(relativeBox)
    const isEnemyArmor = armorHits.find((hit) => { return hit.entity && !hit.entity.isOwnedBy(player) })
    if (isEnemyArmor) return false

    return  this.isOnValidPlatform(container, x, y, w, h, angle, player) &&
            this.isWithinInteractDistance(x, y, player) &&
                         !this.isOnHangar(container, x, y, w, h) &&
                         !container.unitMap.isOccupied(x, y, w, h) &&
                         !container.structureMap.isOccupied(x, y, w, h)
  }

  getType() {
    return Protocol.definition().BuildingType.Ventilator
  }

  getSpritePath() {
    return "ventilator.png"
  }

  getConstantsTable() {
    return "Buildings.Ventilator"
  }

}

module.exports = Ventilator
