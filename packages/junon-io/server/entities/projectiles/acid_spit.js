const CollidableProjectile = require("./collidable_projectile")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class AcidSpit extends CollidableProjectile {

  onCollide(entity) {
    let canDamage = super.onCollide(entity)
    
    if (canDamage) {
      let is50PercentChance = Math.random() > 0.5
      if (is50PercentChance) {
        entity.addPoison()
      }
    }

    return canDamage
  }

  getType() {
    return Protocol.definition().ProjectileType.AcidSpit
  }

  getConstantsTable() {
    return "Projectiles.AcidSpit"
  }


}

module.exports = AcidSpit
