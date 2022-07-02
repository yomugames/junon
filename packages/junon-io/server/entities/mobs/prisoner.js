const LandMob = require("./land_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')

class Prisoner extends LandMob {
  getType() {
    return Protocol.definition().MobType.Prisoner
  }

  getConstantsTable() {
    return "Mobs.Prisoner"
  }
}

module.exports = Prisoner
