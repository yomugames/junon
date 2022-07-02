const BaseTower = require("./base_tower")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')
const Projectiles = require('./../../projectiles/index')

class MissileTurret extends BaseTower {

  getType() {
    return Protocol.definition().BuildingType.MissileTurret
  }

  getConstantsTable() {
    return "Buildings.MissileTurret"
  }

  getDamage(entity) {
    let damage = super.getDamage()
    let multiplier = entity && entity.hasCategory("flying") ? 2 : 1
    return damage * multiplier
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

    const projectile = new Projectiles.Missile({
      weapon:  this,
      destinationEntity:  attackTarget,
      source:      { x: this.getX(),         y: this.getY() },
      destination: this.calculateDestination(attackTarget),
      ignoreObstacles: true
    })
  }

  getDefaultTargets() {
    let result = 0

    if (!this.game.isPvP()) {
      result += (1 << Protocol.definition().AttackTargetType.Mob)
    }

    result += (1 << Protocol.definition().AttackTargetType.Player)
    
    return result
  }

  applyTargetSelectionStrategy(targets) {
    let flying = targets.find((target) => {
      return target.hasCategory("flying") 
    })

    if (flying) return flying

    const randomIndex = Math.floor(Math.random() * targets.length)
    return targets[randomIndex] || null
  }

  canStore(index, item) {
    if (!item) return true // allow swap with blank space slot

    return item.isMissileAmmo()
  }

  getAmmoType() {
    return "Missile"
  }


}

module.exports = MissileTurret
