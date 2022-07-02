const BaseMob = require("./base_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')

class Catapult extends BaseMob {
  getType() {
    return Protocol.definition().MobType.Catapult
  }

  getConstantsTable() {
    return "Mobs.Catapult"
  }

  performAttack(attackTarget) {
    const projectile = new Projectiles.Rock({
      weapon:        this,
      source:      { x: this.getX(),         y: this.getY() },
      destination: this.calculateDestination(attackTarget)
    })
  }


}

module.exports = Catapult
