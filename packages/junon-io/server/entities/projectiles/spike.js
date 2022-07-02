const HitscanProjectile = require("./hitscan_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class Spike extends HitscanProjectile {

  getType() {
    return Protocol.definition().ProjectileType.Spike
  }

  getConstantsTable() {
    return "Projectiles.Spike"
  }

}

module.exports = Spike
