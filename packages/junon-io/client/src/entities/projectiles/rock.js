const BaseProjectile = require("./base_projectile")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Rock extends BaseProjectile {

  getSpritePath() {
    return 'bubble.png'
  }

  getType() {
    return Protocol.definition().ProjectileType.Rock
  }

  getConstantsTable() {
    return "Projectiles.Rock"
  }

}

module.exports = Rock
