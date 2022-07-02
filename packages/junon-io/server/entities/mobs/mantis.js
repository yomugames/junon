const LandMob = require("./land_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')

class Mantis extends LandMob {

  getType() {
    return Protocol.definition().MobType.Mantis
  }

  getConstantsTable() {
    return "Mobs.Mantis"
  }

}

module.exports = Mantis
