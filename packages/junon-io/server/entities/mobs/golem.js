const LandMob = require("./land_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')

class Golem extends LandMob {
  getType() {
    return Protocol.definition().MobType.Golem
  }

  getConstantsTable() {
    return "Mobs.Golem"
  }
}

module.exports = Golem
