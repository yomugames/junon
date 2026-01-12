const BaseTower = require("./base_tower")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')
const Projectiles = require('./../../projectiles/index')
const EventBus = require('eventbusjs')

class VoidRay extends BaseTower {

  getType() {
    return Protocol.definition().BuildingType.VoidRay
  }

  getConstantsTable() {
    return "Buildings.VoidRay"
  }

  onPostAttackEntityRemoved(event) {
    let entity = event.target
    if (entity === this.attackTarget) {
      if (this.projectile) {
        this.projectile.markForRemoval()
        this.projectile = null
      }
    }
  }

  spawnProjectile(attackTarget) {
    this.projectile = Projectiles.VoidRayLight.build({
      weapon: this,
      destinationEntity:  attackTarget,
      source:      { x: this.getX(),         y: this.getY() },
      destination: { x: attackTarget.getX(), y: attackTarget.getY() }
    })
  }

  onTargetOutOfRange(attackTarget) {
    super.onTargetOutOfRange(attackTarget)

    if (this.projectile) {
      this.projectile.markForRemoval()
      this.projectile = null
    }
  }


  onAttackTargetFound() {
    super.onAttackTargetFound()

    this.isFirstHit = true

    // remove old projectile ray since we have new target
    if (this.projectile) {
      this.projectile.markForRemoval()
      this.projectile = null
    }
  }

  performAttack(attackTarget) {
    if (this.isFirstHit) {
      this.spawnProjectile(attackTarget)

      this.isFirstHit = false
    }

    super.performAttack(attackTarget)
  }


}

module.exports = VoidRay
