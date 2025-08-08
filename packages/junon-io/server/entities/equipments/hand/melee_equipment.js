const HandEquipment = require("./hand_equipment")
const Helper = require('../../../../common/helper')
const Constants = require('../../../../common/constants')
const Protocol = require('../../../../common/util/protocol')

class MeleeEquipment extends HandEquipment {

  getMeleeTargetOptions() {
    let meleeTargetOptions = {}

    let additionalAttackables = this.getAdditionalAttackables()
    if (additionalAttackables.length > 0) {
      meleeTargetOptions["additionalAttackables"] = additionalAttackables
    }

    if (this.getAttackRadius()) {
      meleeTargetOptions["attackRadius"] = this.getAttackRadius()
    }

    return meleeTargetOptions
  }

  use(user, targetEntity, options = {}) {
    if (options.skipAttack) {
      super.use(user, targetEntity, options)
      return
    }

    let success
    let meleeTargetOptions = this.getMeleeTargetOptions()

    if (this.canHitMultipleTargets()) {
      let targets = user.getMeleeTargets(this.getMeleeRange(), meleeTargetOptions) //this.getMeleeTarget(user)

      targets = targets.slice(0, this.getConcurrentTargetCount())

      targets.forEach((target) => {
        this.useOnTarget(user, target)
      })

      success = true
    } else {
      let target
      if (user.isMob && user.isMob()) {
        target = targetEntity
      } else {
        target = user.getMeleeTarget(this.getMeleeRange(), meleeTargetOptions)
      }
      
      success = this.useOnTarget(user, target)
    }

    if (success) {
      options.shouldAnimate = success

      super.use(user, targetEntity, options)

      user.consumeStamina("attack")
      user.isAttacking = true
    } else {
      this.onMeleeAttackFailure(user)
    }
  }

  onMeleeAttackFailure(user) {

  }

  getConcurrentTargetCount() {
    return this.getConstants().concurrentTargetCount
  }

  getAttackRadius() {
    return this.getStats().attackRadius
  }

  getAdditionalAttackables() {
    return []
  }

  isMeleeEquipment() {
    return true
  }

  canHitMultipleTargets() {
    return this.getConstants().concurrentTargetCount &&
           this.getConstants().concurrentTargetCount > 1
  }

  getMeleeTarget(user) {
    return user.getMeleeTarget(this.getMeleeRange())
  }

  useOnTarget(user, target) {
  const damage = user.getDamage(target);
  if (target) {
    target.damage(damage, user, this);
    
  if (user.isPlayer()) {
    }

    if (this.canStunEnemy()) {
      this.applyStun(target);
    }
  }

  return true;
}

  applyStun(target) {
    let knockChance = 1 //0.15
    if (Math.random() < knockChance) {
      target.setIsKnocked(true)
    }
  }

  canStunEnemy() {
    return this.getConstants().canStunEnemy
  }
}

module.exports = MeleeEquipment
