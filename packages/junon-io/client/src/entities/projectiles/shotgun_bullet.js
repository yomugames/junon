const BaseProjectile = require("./base_projectile")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")
const Helper = require("./../../../../common/helper")

class ShotgunBullet extends BaseProjectile {

  onProjectileConstructed() {
    this.game.playSound("shotgun")
    this.sprite.anchor.set(1) // so the head is where the actual position of bullet is
  }

  getSpritePath() {
    return 'bullet_projectile.png'
  }

  getType() {
    return Protocol.definition().ProjectileType.ShotgunBullet
  }

  getConstantsTable() {
    return "Projectiles.ShotgunBullet"
  }

}

module.exports = ShotgunBullet
