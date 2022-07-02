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

  performAttack(attackTarget) {
    this.lastAttackTimestamp = this.game.timestamp

    this.shootProjectile(attackTarget)
  }

  hasAmmo() {
    return this.fuelNetwork.getTotalResourceStored() > this.getResourceConsumption('fuel')
  }

  shootProjectile(attackTarget, options = {}) {
    if (!options.ignoreAmmo) {
      if (!this.hasAmmo() && !this.hasInfiniteAmmo()) return

      if (this.getResourceStored('fuel') > this.getResourceConsumption('fuel')) {
        this.consumeResource('fuel', this.getResourceConsumption('fuel'))
      } else {
        this.fuelNetwork.consumeResource(this)
      }
    }


    if (!options.ignoreTarget) {
      let absoluteAngleTowardsAttackTarget = Math.atan2(attackTarget.getY() - this.getY(), attackTarget.getX() - this.getX())
      let absoluteDegTowardsAttackTarget = Math.floor(absoluteAngleTowardsAttackTarget * (180 / Math.PI))
      if (this.getAngle() !== absoluteDegTowardsAttackTarget) {
        return
      }
    }

    let sourcePoint = this.game.pointFromDistance(this.getX(), this.getY(), Constants.tileSize, this.getAbsoluteRadAngle())

    let distance = Constants.tileSize

    let longestPoint = Math.floor(this.getAttackRange() / Constants.tileSize) - 1
    let distanceMultipliers = Array(longestPoint).fill().map((element, index) => index + 1)
    let points = distanceMultipliers.map((multiplier) => {
      return this.game.pointFromDistance(sourcePoint[0], sourcePoint[1], distance * multiplier, this.getRadAngle())
    })

    let minWidth = Constants.Projectiles.Flame.minWidth
    let maxWidth = Constants.Projectiles.Flame.maxWidth

    for (var i = 0; i < points.length; i++) {
      let point = points[i]
      let width = Math.min(maxWidth, minWidth + (i * 6))

      new Projectiles.Flame({
        weapon: this,
        source:      { x: point[0], y: point[1] },
        destination: { x: point[0], y: point[1] },
        w: width,
        h: width
      })

    }
  }

  onTurnExecuted() {
  }

  canStore(index, item) {
    if (!item) return true // allow swap with blank space slot

    return item.isBulletAmmo()
  }


}

module.exports = FlamethrowerTurret
