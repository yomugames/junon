const BaseMob = require("./base_mob")
const ClientHelper = require("./../../util/client_helper")

class LandMob extends BaseMob {
  shouldCreateDeadBody() {
    return true
  }

  isLandMob() {
    return true
  }

  animateExplosion() {
    const smokeCount = 4
    for (var i = 0; i < smokeCount; i++) {
      ClientHelper.addSmoke(this.getX(), this.getY())
    }
  }
}

module.exports = LandMob