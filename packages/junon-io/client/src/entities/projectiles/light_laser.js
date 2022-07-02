const BasicLaser = require("./basic_laser")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class LightLaser extends BasicLaser {

  onProjectileConstructed() {
    this.game.playSound("light_laser")
  }

  getSpritePath() {
    return 'light_laser.png'
  }

  getType() {
    return Protocol.definition().ProjectileType.LightLaser
  }

  getConstantsTable() {
    return "Projectiles.LightLaser"
  }

}

module.exports = LightLaser
