const BaseProjectile = require("./base_projectile")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")
const Helper = require("./../../../../common/helper")

class Spike extends BaseProjectile {

  onProjectileConstructed() {
  }


  getSpritePath() {
    return 'spike.png'
  }

  getType() {
    return Protocol.definition().ProjectileType.Spike
  }

  getConstantsTable() {
    return "Projectiles.Spike"
  }

}

module.exports = Spike
