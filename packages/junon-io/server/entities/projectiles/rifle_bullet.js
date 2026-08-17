const CollidableProjectile = require("./collidable_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class RifleBullet extends CollidableProjectile {

  getType() {
    return Protocol.definition().ProjectileType.RifleBullet
  }

  getConstantsTable() {
    return "Projectiles.RifleBullet"
  }

}

module.exports = RifleBullet
