const LandMob = require("./land_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')

class Villager extends LandMob {
  getType() {
    return Protocol.definition().MobType.Villager
  }

  getConstantsTable() {
    return "Mobs.Villager"
  }

  canBeKnocked() {
    return true
  }

  setNeutral(isNeutral) {
    this.isNeutral = true // always neutral
  }

  onPositionChanged() {
    super.onPositionChanged()
    let tile = this.getTile()
    if (!tile) this.setHealth(0) //sky
  }

  getTile(row=this.getRow(), col=this.getCol()) {
    return this.getPathFinder().getTile(row,col)
  }
}

module.exports = Villager
