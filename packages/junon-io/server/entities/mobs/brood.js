const LandMob = require("./land_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')

class Brood extends LandMob {
  getType() {
    return Protocol.definition().MobType.Brood
  }

  getConstantsTable() {
    return "Mobs.Brood"
  }

  isNightMob() {
    return true
  }

}

module.exports = Brood
