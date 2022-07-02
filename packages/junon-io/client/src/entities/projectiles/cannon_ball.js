const BaseProjectile = require("./base_projectile")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class CannonBall extends BaseProjectile {

  getSpritePath() {
    return 'cannon_ball.png'
  }

  getType() {
    return Protocol.definition().ProjectileType.CannonBall
  }

  getConstantsTable() {
    return "Projectiles.CannonBall"
  }

}

module.exports = CannonBall
