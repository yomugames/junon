const CollidableProjectile = require("./collidable_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class Bubble extends CollidableProjectile {

  getType() {
    return Protocol.definition().ProjectileType.Bubble
  }

  getConstantsTable() {
    return "Projectiles.Bubble"
  }


}

module.exports = Bubble
