const CollidableProjectile = require("./collidable_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class PlasmaBullet extends CollidableProjectile {

  getType() {
    return Protocol.definition().ProjectileType.PlasmaBullet
  }

  getConstantsTable() {
    return "Projectiles.PlasmaBullet"
  }

}

module.exports = PlasmaBullet
