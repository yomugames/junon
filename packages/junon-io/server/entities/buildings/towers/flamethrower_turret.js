const BaseTower = require("./base_tower")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')
const Projectiles = require('./../../projectiles/index')

class FlamethrowerTurret extends BaseTower {

  onBuildingPlaced() {
    super.onBuildingPlaced()

    this.burstCount = 0
  }

  getType() {
    return Protocol.definition().BuildingType.FlamethrowerTurret
  }

  getConstantsTable() {
    return "Buildings.FlamethrowerTurret"
  }

  getBurstCount() {
    return this.getConstants().stats.burstCount || 1
  }

  getBurstTimeout() {
    return this.getConstants().stats.burstTimeout || 0
  }

  getSpreadAngle() {
    return this.getConstants().stats.spreadAngle || 0
  }

  performAttack(attackTarget) {
    this.lastAttackTimestamp = this.game.timestamp

    const burstCount = this.getBurstCount()
    const burstTimeout = this.getBurstTimeout()
    let bursts = 0

    const fireNext = () => {
      if (bursts >= burstCount) return

      if (!this.hasAmmo() && !this.hasInfiniteAmmo()) {
        bursts = burstCount
        return
      }

      this.shootProjectile(attackTarget)
      bursts++
      if (bursts < burstCount) {
        setTimeout(fireNext, burstTimeout)
      }
    }

    fireNext()
  }

  hasAmmo() {
    return this.fuelNetwork.getTotalResourceStored() > this.getResourceConsumption('fuel')
  }

  shootProjectile(attackTarget) {
    if (this.getResourceStored('fuel') > this.getResourceConsumption('fuel')) {
      this.consumeResource('fuel', this.getResourceConsumption('fuel'))
    } else {
      this.fuelNetwork.consumeResource(this)
    }

    let absoluteAngleTowardsAttackTarget = Math.atan2(attackTarget.getY() - this.getY(), attackTarget.getX() - this.getX())
    let absoluteDegTowardsAttackTarget = Math.floor(absoluteAngleTowardsAttackTarget * (180 / Math.PI))
    if (this.getAngle() !== absoluteDegTowardsAttackTarget) {
      return
    }

    const spreadAngle = this.getSpreadAngle()
    const randomOffset = (2 * Math.random() - 1) * spreadAngle
    const angleInRad = absoluteAngleTowardsAttackTarget + (randomOffset * Math.PI / 180)

    const range = this.getAttackRange()
    const destination = {
      x: this.getX() + Math.cos(angleInRad) * range,
      y: this.getY() + Math.sin(angleInRad) * range
    }

    let sourcePoint = this.game.pointFromDistance(this.getX(), this.getY(), Constants.tileSize, angleInRad)

    Projectiles.Flame.build({
      weapon: this,
      source: { x: sourcePoint[0], y: sourcePoint[1] },
      destination: destination,
      w: Constants.Projectiles.Flame.minWidth,
      h: Constants.Projectiles.Flame.minWidth,
      piercesWalls: true
    })
  }

  onTurnExecuted() {
  }

  canStore(index, item) {
    if (!item) return true
    return item.isBulletAmmo()
  }
  
}

module.exports = FlamethrowerTurret
