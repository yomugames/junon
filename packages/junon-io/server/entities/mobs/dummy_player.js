const LandMob = require("./land_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')

class DummyPlayer extends LandMob {
  getType() {
    return Protocol.definition().MobType.DummyPlayer
  }

  getConstantsTable() {
    return "Mobs.DummyPlayer"
  }

  onPostInit() {
    this.setDormant(true)
    this.setAngle(90)
  }

  onHealthReduced() {
    this.health = this.getMaxHealth()
  }

  onContentChanged() {
    super.onContentChanged()

    if (this.owner && this.owner.isPlayer()) {
      this.owner.walkthroughManager.handle("player_permissions")
    }
  }

}

module.exports = DummyPlayer
