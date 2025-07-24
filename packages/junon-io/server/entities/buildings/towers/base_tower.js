const p2 = require("p2")
const vec2 = p2.vec2
const Constants = require('../../../../common/constants.json')
const Destroyable = require('../../../../common/interfaces/destroyable')
const Attacker = require('../../../../common/interfaces/attacker')
const BaseBuilding = require("./../base_building")
const Protocol = require('../../../../common/util/protocol')

class BaseTower extends BaseBuilding {

  onBuildingPlaced() {
    super.onBuildingPlaced()

    this.container.towers[this.id] = this

    this.initAttacker()
  }

  onConstructionFinished() {
    super.onConstructionFinished()
  }

  unregister() {
    super.unregister()

    delete this.container.towers[this.id]
  }

  // should be in common
  initVariables(data) {
    super.initVariables(data)

    this.maxSpeed = 900
    this.CLOSE_DISTANCE_FROM_TARGET = 100
    this.SEPERATION_FROM_NEIGHBORS  = 100
  }

  isDestroyable() {
    return true
  }

  isTower() {
    return true
  }

  alive() {
    return true
  }

  setFollowTarget(followTarget) {
    this.followTarget = followTarget
  }

  executeTurn() {
    if (!this.hasMetPowerRequirement()) return

    this.setAngleToFollowTarget()
    this.attackNearbyOpponents()

    this.onTurnExecuted()
  }

  onTurnExecuted() {

  }

  notifyViewSubscribers() {
    Object.values(this.getViewSubscribers()).forEach((viewSubscriber) => {
      this.getSocketUtil().emit(viewSubscriber.getSocket(), "RenderStorage", {
        id: this.id,
        inventory: this
      })
    })
  }

  setAngleToFollowTarget() {
    if (this.attackTarget) {
      const relativeRadian = Math.atan2(this.attackTarget.getY() - this.getY(),
                                        this.attackTarget.getX() - this.getX())
      const relativeDeg = Math.floor(relativeRadian * (180 / Math.PI))
      this.setAngle(relativeDeg - this.container.getAngle())
    }
  }

  cantMove() {
    return false
  }

  getStorageItem() {
    return this.get(0)
  }

  hasAmmo() {
    let storageItem = this.getStorageItem()
    if (!storageItem) return false
    return true;
    //return storageItem.isAmmo()
  }

  getDefaultTargets() {
    let result = 0

    if (!this.game.isPvP()) {
      result += (1 << Protocol.definition().AttackTargetType.Mob)
    }

    result += (1 << Protocol.definition().AttackTargetType.Player)

    return result
  }


  getAmmoCount() {
    let storageItem = this.getStorageItem()
    if (!storageItem) return 0

    return storageItem.count
  }

  getAmmoType() {
    return null
  }

  getDamage() {
    if (this.sector) {
      if (this.sector.entityCustomStats[this.id]) {
        return this.sector.entityCustomStats[this.id].damage
      }

      if (this.sector.buildingCustomStats[this.type]) {
        return this.sector.buildingCustomStats[this.type].damage
      }
    }

    return this.getStats(this.level).damage
  }

  hasInfiniteAmmo() {
    return this.sector.hasInfiniteAmmo()
  }

  remove() {
    super.remove()

    this.deinitAttacker()

    if (this.projectile) {
      this.projectile.markForRemoval()
      this.projectile = null
    }
  }

}

Object.assign(BaseTower.prototype, Attacker.prototype, {
  onAttackTargetFound() {
    if (this.container.pilot) {
      this.container.pilot.attackTarget = this.attackTarget
      this.container.pilot.onAttackTargetFound()
    }
  },
  onTargetOutOfRange() {
    if (this.container.pilot) {
      this.container.pilot.attackTarget = null
      this.container.pilot.onTargetOutOfRange()
    }
  },
  shouldChooseTarget(target) {
    if (this.isFriendlyUnit(target)) return false
    if (target.hasCategory("ghost")) return false

    if (target.isMob()) {
      // let mobNotFromRaidAndNotAttackingAnyone = !target.getRaid() && !target.desiredAttackTarget
      // if (mobNotFromRaidAndNotAttackingAnyone) return false

      return this.isTargetEnabled(Protocol.definition().AttackTargetType.Mob)
    }

    if (target.isPlayer()) {
      return this.isTargetEnabled(Protocol.definition().AttackTargetType.Player)
    }

    return false
  },
  canDamage(target) {
    if (this.isFriendlyUnit(target)) return false
    if (target.hasCategory("ghost")) return false
    if (target.storage) return false  // inside cryotube

    if (target.isMob()) {
      return true
    }

    if (target.isPlayer()) {
      return true
    }

    return false
  },
  getAttackRange() {
    return this.getRange()
  },
  getRange() {
    if (this.sector) {
      if (this.sector.entityCustomStats[this.id]) {
        return this.sector.entityCustomStats[this.id].range
      }

      if (this.sector.buildingCustomStats[this.type]) {
        return this.sector.buildingCustomStats[this.type].range
      }
    }


    return this.getConstants().stats.range
  },
  getAttackInterval() {
    return this.getStats(this.level).reload
  },
  performAttack(attackTarget) {
    const destroyable = attackTarget
    const damage = this.getDamage()
    destroyable.damage(damage, this)
  },
  getAttackables() {
    return [this.sector.mobTree, this.sector.playerTree]
  }

})

module.exports = BaseTower
