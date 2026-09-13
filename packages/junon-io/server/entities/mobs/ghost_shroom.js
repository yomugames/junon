const HoverMob = require("./hover_mob")
const Protocol = require("../../../common/util/protocol")
const Constants = require("../../../common/constants.json")
const Projectiles = require('../projectiles/index')

class GhostShroom extends HoverMob {
  onPostInit() {
    this.invisibilityLost = false
    this.addInvisible()
  }

  executeTurn() {
    super.executeTurn()

    if (this.invisibilityLost && this.attackTarget) return

    const target = this.attackTarget || this.desiredAttackTarget
    if (target && this.game.distanceBetween(this, target) < 200) {
      this.removeInvisible()
      this.invisibilityLost = true
      return
    }

    this.addInvisible()
    this.invisibilityLost = false
  }

  getType() {
    return Protocol.definition().MobType.GhostShroom
  }

  getConstantsTable() {
    return "Mobs.GhostShroom"
  }

  performAttack(attackTarget) {
    super.performAttack(attackTarget)

    if (Math.random() < this.getFearStatusChance()) {
      attackTarget.addFear()
    }
  }

  getAttackInterval() {
    return this.getConstants().stats.reload
  }

  getFearStatusChance() {
    return 0.3
  }

}

module.exports = GhostShroom
