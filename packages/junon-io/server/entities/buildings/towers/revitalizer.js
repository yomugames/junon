const BaseTower = require("./base_tower")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')
const Projectiles = require('./../../projectiles/index')
const Attacker = require('../../../../common/interfaces/attacker')

class Revitalizer extends BaseTower {

  getType() {
    return Protocol.definition().BuildingType.Revitalizer
  }

  getConstantsTable() {
    return "Buildings.Revitalizer"
  }

  initVariables(data) {
    super.initVariables(data)
    this.maxSpeed = 500
    this.hasBeamActive = false // to remember what client is doing
  }

  performAttack(attackTarget) {
    if (!this.hasAmmo() && !this.hasInfiniteAmmo()){
      if(this.hasBeamActive) {
        this.getSocketUtil().broadcast(this.game.getSocketIds(), "RevitalizerActivate", { entityId: this.getId(), targetId: attackTarget.getId(), isEmpty: true })
        this.hasBeamActive = false
      }
      return
    }

    this.hasBeamActive = true

    let absoluteAngleTowardsAttackTarget = Math.atan2(attackTarget.getY() - this.getY(), attackTarget.getX() - this.getX())
    let absoluteDegTowardsAttackTarget = Math.floor(absoluteAngleTowardsAttackTarget * (180 / Math.PI))
    if (this.getAngle() !== absoluteDegTowardsAttackTarget) {
      return
    }

    if (this.getResourceStored('fuel') > this.getResourceConsumption('fuel')) {
      this.consumeResource('fuel', this.getResourceConsumption('fuel'))
    } else {
      this.fuelNetwork.consumeResource(this)
    }

    attackTarget.setHealth(attackTarget.health + this.getDamage())
    this.getSocketUtil().broadcast(this.game.getSocketIds(), "RevitalizerActivate", { entityId: this.getId(), targetId: attackTarget.getId(), isEmpty: false })
  }

  shouldChooseTarget(target) {
    if (target.isMob() || target.isPlayer()) return false
    if (target.hasCategory("ghost")) return false
    if (target.getType() === Protocol.definition().BuildingType.Revitalizer) return false

    return true
  }

  canAttack(target) {
    if (!target.isRepairable()) return false
    if(!this.isFriendlyUnit(target)) return false
    if(this.owner !== target.owner) return false
    if(!this.shouldChooseTarget(target)) return false
    if(target.isDestroyed() || target.isRemoved) return false

    return true    
  }

  getAttackables() {
    return [this.sector.buildingTree]
  }

  hasAmmo() {
    return this.fuelNetwork.getTotalResourceStored() > this.getResourceConsumption('fuel')
  }

  attackNearbyOpponents() {
    // building scan can be laggy for server, so scan less with higher range
    if (this.lastScanTargetsTime && !this.attackTarget) {
      let duration = this.game.timestamp - this.lastScanTargetsTime
      if (duration < Constants.physicsTimeStep * Math.pow(this.getRange() / 640, 2)) {
        return
      }
    }

    this.lastScanTargetsTime = this.game.timestamp

    if (this.shouldAttack()) {
      this.examineAttackRange()
      this.examineLineOfSightRange()
      this.examineLongRange()
      this.examineDesiredAttackTarget()

      this.attack()
    } else {
      this.setAttackTarget(null)      
    }
  }

}

module.exports = Revitalizer
