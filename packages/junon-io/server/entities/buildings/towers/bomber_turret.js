const BaseTower = require("./base_tower")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')
const Projectiles = require('./../../projectiles/index')

class BomberTurret extends BaseTower {

  getType() {
    return Protocol.definition().BuildingType.BomberTurret
  }

  getConstantsTable() {
    return "Buildings.BomberTurret"
  }

  performAttack(attackTarget) {
    if (!this.hasAmmo() && !this.hasInfiniteAmmo()) return

    let absoluteAngleTowardsAttackTarget = Math.atan2(attackTarget.getY() - this.getY(), attackTarget.getX() - this.getX())
    let absoluteDegTowardsAttackTarget = Math.floor(absoluteAngleTowardsAttackTarget * (180 / Math.PI))
    if (this.getAngle() !== absoluteDegTowardsAttackTarget) {
      return
    }

    if (!this.hasInfiniteAmmo()) {
      this.getStorageItem().consume()
      this.notifyViewSubscribers()
    }

    const projectile = Projectiles.Grenade.build({
      weapon:  this,
      destinationEntity:  attackTarget,
      source:      { x: this.getX(),         y: this.getY() },
      destination: this.calculateDestination(attackTarget),
      ignoreObstacles: true,
      countdown: 0
    })
  }

  canStore(index, item) {
    if (!item) return true // allow swap with blank space slot

    return item.isGrenade()
  }

  getAmmoType() {
    return "Grenade"
  }

}

module.exports = BomberTurret
