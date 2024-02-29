const BaseProjectile = require("./base_projectile")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")
const Helper = require("./../../../../common/helper")

class Dynamite extends BaseProjectile {

  onProjectileConstructed() {
    // this.game.playSound("shotgun")
  }

  getSpritePath() {
    return 'dynamite.png'
  }

  getType() {
    return Protocol.definition().ProjectileType.Dynamite
  }

  getConstantsTable() {
    return "Projectiles.Dynamite"
  }

}

module.exports = Dynamite
