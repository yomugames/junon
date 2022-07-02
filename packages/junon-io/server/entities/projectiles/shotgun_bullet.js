const CollidableProjectile = require("./collidable_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class ShotgunBullet extends CollidableProjectile {

  getType() {
    return Protocol.definition().ProjectileType.ShotgunBullet
  }

  getConstantsTable() {
    return "Projectiles.ShotgunBullet"
  }


}

module.exports = ShotgunBullet
