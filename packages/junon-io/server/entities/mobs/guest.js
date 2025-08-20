const LandMob = require("./land_mob")
const Protocol = require("../../../common/util/protocol")
const Constants = require("../../../common/constants.json")
const Projectiles = require('../projectiles/index')

class Guest extends LandMob {
  getType() {
    return Protocol.definition().MobType.Guest
  }

  getConstantsTable() {
    return "Mobs.Guest"
  }

  canBeKnocked() {
    return true
  }

  setNeutral(isNeutral) {
    this.isNeutral = true // always neutral
  }

  onPositionChanged() { //kill if on sky
    // super.onPositionChanged()
    // let tile = this.getTile()
    // if (!tile) this.setHealth(0)
  }

  getTile(row=this.getRow(), col=this.getCol()) {
    return this.getPathFinder().getTile(row,col)
  }
}

module.exports = Guest
