const BaseProjectile = require("./base_projectile")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")
const Helper = require("./../../../../common/helper")

class MiningExplosion extends BaseProjectile {

  onProjectileConstructed() {
    if (this.data.width > (Constants.tileSize * 2)) {
      this.game.playSound("explosion")
    }
    
    this.animateExplosion()
  }

  animateExplosion() {
    ClientHelper.animateExplosion(this.getX(), this.getY(), { 
      minWidth: 32, 
      maxWidth: this.data.width,
      tint: 0xd1c04a
    })

    const smokeCount = 6
    for (var i = 0; i < smokeCount; i++) {
      ClientHelper.addSmoke(this.getX(), this.getY())
    }

  }

  getSpritePath() {
    return 'explosion.png'
  }

  getType() {
    return Protocol.definition().ProjectileType.MiningExplosion
  }

  getConstantsTable() {
    return "Projectiles.MiningExplosion"
  }

}

module.exports = MiningExplosion
