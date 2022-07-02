const BaseProjectile = require("./base_projectile")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class AcidSpit extends BaseProjectile {

  getSpritePath() {
    return 'acid_spit.png'
  }

  getType() {
    return Protocol.definition().ProjectileType.AcidSpit
  }

  getConstantsTable() {
    return "Projectiles.AcidSpit"
  }

}

module.exports = AcidSpit
