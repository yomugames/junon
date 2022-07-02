const CollidableProjectile = require("./collidable_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class BlasterLaser extends CollidableProjectile {

  getType() {
    return Protocol.definition().ProjectileType.BlasterLaser
  }

  getConstantsTable() {
    return "Projectiles.BlasterLaser"
  }

}

module.exports = BlasterLaser
