const BaseProjectile = require("./base_projectile")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")
const Helper = require("./../../../../common/helper")

class Grenade extends BaseProjectile {

  onProjectileConstructed() {
    // this.game.playSound("shotgun")
  }

  getSpritePath() {
    return 'grenade.png'
  }

  getType() {
    return Protocol.definition().ProjectileType.Grenade
  }

  getConstantsTable() {
    return "Projectiles.Grenade"
  }

}

module.exports = Grenade
