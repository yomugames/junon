const BaseProjectile = require("./base_projectile")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class BasicLaser extends BaseProjectile {

  onProjectileConstructed() {
    this.game.playSound("machine_gun_2_b")
  }

  getSpritePath() {
    return 'basic_laser_projectile.png'
  }

  getType() {
    return Protocol.definition().ProjectileType.BasicLaser
  }

  getConstantsTable() {
    return "Projectiles.BasicLaser"
  }

}

module.exports = BasicLaser
