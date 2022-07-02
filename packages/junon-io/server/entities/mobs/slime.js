const LandMob = require("./land_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')

class Slime extends LandMob {
  getType() {
    return Protocol.definition().MobType.Slime
  }

  getConstantsTable() {
    return "Mobs.Slime"
  }

  canBeKnocked() {
    return true
  }

  setNeutral(isNeutral) {
    this.isNeutral = true // always neutral
  }

  performAttack(attackTarget) {
    super.performAttack(attackTarget)
  }

  onHealthZero() {
    super.onHealthZero()

    let lastHitBy = this.game.getEntity(this.attackerId)
    if (lastHitBy && lastHitBy.isPlayer()) {
      lastHitBy.walkthroughManager.handle("kill_slime")
    }
  }

}

module.exports = Slime
