const CollidableProjectile = require("./collidable_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class Rock extends CollidableProjectile {

  getType() {
    return Protocol.definition().ProjectileType.Rock
  }

  getConstantsTable() {
    return "Projectiles.Rock"
  }


}

module.exports = Rock
