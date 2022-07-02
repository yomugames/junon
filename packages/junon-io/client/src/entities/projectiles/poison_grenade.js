const BaseProjectile = require("./base_projectile")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")
const Helper = require("./../../../../common/helper")

class PoisonGrenade extends BaseProjectile {

  onProjectileConstructed() {
    // this.game.playSound("shotgun")
  }

  getSpritePath() {
    return 'poison_grenade.png'
  }

  getType() {
    return Protocol.definition().ProjectileType.PoisonGrenade
  }

  getConstantsTable() {
    return "Projectiles.PoisonGrenade"
  }

}

module.exports = PoisonGrenade
