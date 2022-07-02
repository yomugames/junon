const BaseBuilding = require("./../base_building")

class BaseUnit extends BaseBuilding {
  static isPositionValid(container, x, y, w, h, angle, player) {
    return container.platformMap.isFullyOccupied(x, y, w, h) &&
           this.isWithinInteractDistance(x, y, player) &&
           !this.isOnHangar(container, x, y, w, h) &&
           !container.armorMap.isOccupied(x, y, w, h) &&
           !container.structureMap.isOccupied(x, y, w, h) &&
           !container.unitMap.isOccupied(x, y, w, h)
  }

  constructor(game, data, isEquipDisplay) {
    super(game, data, isEquipDisplay)
  }

  onBuildingConstructed() {
    if (!this.isLaunched) {
      this.container.units[this.id] = this
      this.container.unitMap.register(this.getRelativeBox(), this)
    }
  }

  getGroup() {
    return "units"
  }


  unregister() {
    if (!this.isLaunched) {
      this.getContainer().unregisterEntity("units", this)
      this.container.unitMap.unregister(this.getRelativeBox())
    }
  }

  onLaunchedChanged() {
    if (this.isLaunched) {
      this.sprite.alpha = 0
    } else {
      this.sprite.alpha = 1
      this.setAngle(this.origAngle)
    }
  }

  getX() {
    return this.isLaunched ? this.sprite.x : super.getX()
  }

  getY() {
    return this.isLaunched ? this.sprite.y : super.getY()
  }
}

module.exports = BaseUnit
