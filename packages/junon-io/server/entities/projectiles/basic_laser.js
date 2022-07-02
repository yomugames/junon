const CollidableProjectile = require("./collidable_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class BasicLaser extends CollidableProjectile {

  getType() {
    return Protocol.definition().ProjectileType.BasicLaser
  }

  getConstantsTable() {
    return "Projectiles.BasicLaser"
  }

}

module.exports = BasicLaser
