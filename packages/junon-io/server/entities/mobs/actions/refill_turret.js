const BaseAction = require("./base_action")
const Item = require("../../item")

class RefillTurret extends BaseAction {
  static setup(planner) {
    let item = planner.entity.getHandItem()
    if (!item) return false

    if (item.isBulletAmmo() || item.isMissileAmmo()) {
      return { ammo: item }
    }
  }

  perform(options) {
    // empty storage
    if (options.turret.isEmpty()) {
      this.planner.entity.equipments.removeItem(options.ammo)
      options.turret.storeAt(0, options.ammo)
    } else {
      let currentAmmo = options.turret.get(0)
      if (currentAmmo.isFullyStacked()) return

      let turretHasWrongAmmo = (options.turret.hasAmmoType("BulletAmmo") && !currentAmmo.isBulletAmmo()) ||
                               (options.turret.hasAmmoType("Missile") && !currentAmmo.isMissileAmmo())

      if (turretHasWrongAmmo) {
        // replace it with bullet ammo
        this.planner.entity.throwInventory(currentAmmo)
        this.planner.entity.equipments.removeItem(options.ammo)
        options.turret.storeAt(0, options.ammo)
        return
      }

      let maxStack = currentAmmo.getMaxStack()
      let currentCount = currentAmmo.count
      let maxFillableCount = maxStack - currentCount
      let targetCount = Math.min(maxFillableCount, options.ammo.count)
      
      options.ammo.reduceCount(targetCount)
      options.turret.increaseItemCount(0, targetCount)
    }
  }

  shouldCompleteAfterPerform() {
    return true
  }

}

module.exports = RefillTurret