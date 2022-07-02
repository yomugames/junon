const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class Ventilator extends BaseBuilding {

  static isPositionValid(container, x, y, w, h, angle, player) {
    let armorHits = container.armorMap.hitTestTile(this.prototype.getBox(x, y, w, h))
    const isEnemyArmor = armorHits.find((hit) => { return hit.entity && !hit.entity.isOwnedBy(player) })
    if (isEnemyArmor) return false

    return  this.isOnValidPlatform(container, x, y, w, h, angle, player) &&
                             !this.isOnHangar(container, x, y, w, h) &&
                             !container.structureMap.isOccupied(x, y, w, h)
  }


  onBuildingPlaced() {
    this.replaceWallsIfPresent()
    super.onBuildingPlaced()
  }

  unregister() {
    super.unregister()
  }

  getConstantsTable() {
    return "Buildings.Ventilator"
  }

  getType() {
    return Protocol.definition().BuildingType.Ventilator
  }

}

module.exports = Ventilator

