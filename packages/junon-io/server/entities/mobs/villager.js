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
}

module.exports = Villager
