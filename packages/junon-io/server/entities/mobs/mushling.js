const LandMob = require("./land_mob")
const Protocol = require("../../../common/util/protocol")
const Constants = require("../../../common/constants.json")
const Projectiles = require('../projectiles/index')

class Mushling extends LandMob {
  getType() {
    return Protocol.definition().MobType.Mushling
  }

  getConstantsTable() {
    return "Mobs.Mushling"
  }

  performAttack(attackTarget) {
    super.performAttack(attackTarget)

    if (Math.random() < this.getPoisonStatusChance()) {
      attackTarget.addPoison()
    }
  }

  getPoisonStatusChance() {
    return 0.2
  }

}

module.exports = Mushling
