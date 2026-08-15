const Grenade = require("./grenade")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class ShockGrenade extends Grenade {
  getType() {
    return Protocol.definition().ProjectileType.ShockGrenade
  }

  getConstantsTable() {
    return "Projectiles.ShockGrenade"
  }

  createExplosion() {
    return this.sector.createProjectile("Shockwave", {
      weapon:        this.weapon,
      source:      { x: this.getX(),         y: this.getY() },
      destination: { x: this.getX(),         y: this.getY() }
    })
  }

}

module.exports = ShockGrenade
