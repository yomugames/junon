const CollidableProjectile = require("./collidable_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class MinigunBullet extends CollidableProjectile {

  getType() {
    return Protocol.definition().ProjectileType.MinigunBullet
  }

  getConstantsTable() {
    return "Projectiles.MinigunBullet"
  }


}

module.exports = MinigunBullet
