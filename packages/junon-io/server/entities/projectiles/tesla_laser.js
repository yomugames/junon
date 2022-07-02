const HitscanProjectile = require("./hitscan_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class TeslaLaser extends HitscanProjectile {

//   onProjectileConstructed() {
//     
//   }
// 
  getType() {
    return Protocol.definition().ProjectileType.TeslaLaser
  }

  accountForObstacles() {
    // dont
  }

  getConstantsTable() {
    return "Projectiles.TeslaLaser"
  }

  getAttackables() {
    return [this.sector.mobTree, this.sector.playerTree, this.sector.buildingTree]
  }

}

module.exports = TeslaLaser
