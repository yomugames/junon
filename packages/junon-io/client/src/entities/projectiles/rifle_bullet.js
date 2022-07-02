const BaseProjectile = require("./base_projectile")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")
const Helper = require("./../../../../common/helper")

class RifleBullet extends BaseProjectile {

  onProjectileConstructed() {
    this.game.playSound("assault_rifle")
    this.sprite.anchor.set(1) // so the head is where the actual position of bullet is
  }


  getSpritePath() {
    return 'bullet_projectile.png'
  }

  getType() {
    return Protocol.definition().ProjectileType.RifleBullet
  }

  getConstantsTable() {
    return "Projectiles.RifleBullet"
  }

}

module.exports = RifleBullet
