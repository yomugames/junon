const BaseTower = require("./base_tower")
const Attacker = require('../../../../common/interfaces/attacker')
const Constants = require('../../../../common/constants')
const Projectiles = require('./../../projectiles/index')
const SocketUtil = require("junon-common/socket_util")

class Miner extends BaseTower {
  onBuildingPlaced() {
    super.onBuildingPlaced()

    this.nextFindTargetTime = this.game.timestamp

    const framesPerSeconds = Constants.physicsTimeStep
    const seconds = 3
    this.FIND_TARGET_INTERVAL = seconds * framesPerSeconds
  }

  getProduction() {
    return this.getStats(this.level).production
  }

  mine() {
    throw new Error("must implement mine")
  }

  executeTurn() {
    this.mineNearbyResources()
  }

  mineNearbyResources() {
    this.attackNearbyOpponents()
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

  onTargetOutOfRange(attackTarget) {
    super.onTargetOutOfRange(attackTarget)

    if (this.projectile) {
      this.projectile.markForRemoval()
      this.projectile = null
    }
  }


  spawnProjectile(attackTarget) {
    this.projectile = new Projectiles.MiningBeam({
      weapon:       this,
      destinationEntity:  attackTarget,
      source:      { x: this.getX(),         y: this.getY() },
      destination: { x: attackTarget.getX(), y: attackTarget.getY() }
    })
  }

  onAttackTargetFound() {
    super.onAttackTargetFound()

    // remove old projectile ray since we have new target
    if (this.projectile) {
      this.projectile.markForRemoval()
      this.projectile = null
    }
  }

  remove() {
    super.remove()

    if (this.projectile) {
      this.projectile.markForRemoval()
      this.projectile = null
    }
  }

  executeFindTargetStrategy() {
    if (this.game.timestamp > this.nextFindTargetTime) {
      let newAttackTarget = this.findAttackTarget()
      if (!newAttackTarget) return

      if (!this.attackTarget) {
        this.attackTarget = newAttackTarget
        this.onAttackTargetFound(this.attackTarget)

        this.nextFindTargetTime = this.game.timestamp + this.FIND_TARGET_INTERVAL
      } else if (this.attackTarget.isMineable() && !newAttackTarget.isMineable() ) {
        // switch attack target
        this.attackTarget = newAttackTarget
        this.onAttackTargetFound(this.attackTarget)

        this.nextFindTargetTime = this.game.timestamp + this.FIND_TARGET_INTERVAL
      }
    }
  }

  applyTargetSelectionStrategy(targets) {
    let hostileTarget = targets.find((target) => {
      return target.isMob() || target.ship
    })

    if (hostileTarget) return hostileTarget

    return targets[0] || null
  }


  performAttack(attackTarget) {
    if (attackTarget.isMineable()) {
      const minedSuccessfully = this.mine()
      if (minedSuccessfully) {
        if (!this.projectile) {
          this.spawnProjectile(attackTarget)
        }
      } else {
        // cant mine anymore
        if (this.projectile) {
          this.projectile.markForRemoval()
          this.projectile = null
          SocketUtil.emit(this.owner.getSocket(), "MineralCapacityReached", { })
        }
      }
    } else {
      if (!this.projectile) {
        this.spawnProjectile(attackTarget)
      }

      const destroyable = attackTarget
      const damage = this.getDamage()
      destroyable.damage(damage, this)
    }
  }


  getAttackables() {
    return [this.sector.mobTree, this.sector.resourceTree, this.sector.buildingTree]
  }

}

module.exports = Miner

