const LandMob = require("./land_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')

class Mutant extends LandMob {
  getType() {
    return Protocol.definition().MobType.Mutant
  }

  getConstantsTable() {
    return "Mobs.Mutant"
  }

  canBeKnocked() {
    return true
  }

  isChaser() {
    return true
  }

  performAttack(attackTarget) {
    super.performAttack(attackTarget)

    if (Math.random() < this.getFearStatusChance()) {
      attackTarget.addFear()
    }
  }

  getFearStatusChance() {
    return 0.35
  }



}

module.exports = Mutant
