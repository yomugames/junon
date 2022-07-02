const LandMob = require("./land_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')

class Spider extends LandMob {
  getType() {
    return Protocol.definition().MobType.Spider
  }

  getConstantsTable() {
    return "Mobs.Spider"
  }

  spawnWeb(x, y) {
    let platform = this.getContainer().platformMap.hitTest(x, y).entity
    if (platform) {
      platform.setWeb()
    }
  }

  performAttack(attackTarget) {
    super.performAttack(attackTarget)

    if (Math.random() < this.getFearStatusChance()) {
      attackTarget.addFear()
    }
  }

  getFearStatusChance() {
    return 0.2
  }

}

module.exports = Spider
