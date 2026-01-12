const Spider = require("./spider")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')

class PoisonSpider extends Spider {

  getType() {
    return Protocol.definition().MobType.PoisonSpider
  }

  getConstantsTable() {
    return "Mobs.PoisonSpider"
  }

  performAttack(attackTarget) {
    const projectile = Projectiles.AcidSpit.build({
      weapon:        this,
      source:      { x: this.getX(),         y: this.getY() },
      destination: this.calculateDestination(attackTarget)
    })
  }

}

module.exports = PoisonSpider
