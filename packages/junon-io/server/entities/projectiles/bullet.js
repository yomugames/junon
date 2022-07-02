const CollidableProjectile = require("./collidable_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class Bullet extends CollidableProjectile {

  getType() {
    return Protocol.definition().ProjectileType.Bullet
  }

  getConstantsTable() {
    return "Projectiles.Bullet"
  }


}

module.exports = Bullet
