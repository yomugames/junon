const BaseProjectile = require("./base_projectile")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")
const Helper = require("./../../../../common/helper")

class ShockGrenade extends BaseProjectile {
  onProjectileConstructed() {
    // this.game.playSound("shotgun")
  }

  getSpritePath() {
    return 'shock_grenade.png'
  }

  getType() {
    return Protocol.definition().ProjectileType.ShockGrenade
  }

  getConstantsTable() {
    return "Projectiles.ShockGrenade"
  }

}

module.exports = ShockGrenade
