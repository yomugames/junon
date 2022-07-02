const BaseProjectile = require("./base_projectile")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class BlasterLaser extends BaseProjectile {

  getSpritePath() {
    return 'blaster_laser.png'
  }

  getType() {
    return Protocol.definition().ProjectileType.BlasterLaser
  }

  getConstantsTable() {
    return "Projectiles.BlasterLaser"
  }

}

module.exports = BlasterLaser
