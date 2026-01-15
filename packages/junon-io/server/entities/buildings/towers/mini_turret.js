const BaseTower = require("./base_tower")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')
const Projectiles = require('./../../projectiles/index')

class MiniTurret extends BaseTower {

  onBuildingPlaced() {
    super.onBuildingPlaced()

    this.burstCount = 0
  }

  getType() {
    return Protocol.definition().BuildingType.MiniTurret
  }

  getConstantsTable() {
    return "Buildings.MiniTurret"
  }

  performAttack(attackTarget) {
    this.lastAttackTimestamp = this.game.timestamp

    this.resetBurstCount()
    this.shootProjectile(attackTarget)
  }

  resetBurstCount() {
    this.burstCount = 0
  }

  shootProjectile(attackTarget) {
    if (!this.hasAmmo() && !this.hasInfiniteAmmo()) return
    if (!attackTarget) return

    let absoluteAngleTowardsAttackTarget = Math.atan2(attackTarget.getY() - this.getY(), attackTarget.getX() - this.getX())
    let absoluteDegTowardsAttackTarget = Math.floor(absoluteAngleTowardsAttackTarget * (180 / Math.PI))
    if (this.getAngle() !== absoluteDegTowardsAttackTarget) {
      return
    }

    if (!this.hasInfiniteAmmo()) {
      this.getStorageItem().consume()
      this.notifyViewSubscribers()
    }

    let sourcePoint = this.game.pointFromDistance(this.getX(), this.getY(), Constants.tileSize, this.getAbsoluteRadAngle())

    const projectile = Projectiles.BasicLaser.build({
      weapon:        this,
      source:      { x: sourcePoint[0],         y: sourcePoint[1] },
      destination: this.getShootTarget(this),
      ignoreObstacles: true
    })

    this.burstCount += 1
  }

  onTurnExecuted() {
    const isFourTickInterval = this.game.timestamp % 4 === 0

    if (isFourTickInterval) {
      let isBurstAllowed = this.attackTarget &&
                           this.game.timestamp !== this.lastAttackTimestamp &&
                           this.burstCount < 3

      if (isBurstAllowed) {
        this.shootProjectile(this.attackTarget)
      }
    }
  }

  getDefaultTargets() {
    let result = 0

    if (!this.game.isPvP()) {
      result += (1 << Protocol.definition().AttackTargetType.Mob)
    }

    result += (1 << Protocol.definition().AttackTargetType.Player)
    
    return result
  }

  canStore(index, item) {
    if (!item) return true // allow swap with blank space slot

    return item.isBulletAmmo()
  }

  getAmmoType() {
    return "BulletAmmo"
  }

}

module.exports = MiniTurret
