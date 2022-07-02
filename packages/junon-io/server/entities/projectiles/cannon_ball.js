const CollidableProjectile = require("./collidable_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class CannonBall extends CollidableProjectile {

  getType() {
    return Protocol.definition().ProjectileType.CannonBall
  }

  getConstantsTable() {
    return "Projectiles.CannonBall"
  }

}

module.exports = CannonBall
