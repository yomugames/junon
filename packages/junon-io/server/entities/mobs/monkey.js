const LandMob = require("./land_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')

class Monkey extends LandMob {

  getType() {
    return Protocol.definition().MobType.Monkey
  }

  getConstantsTable() {
    return "Mobs.Monkey"
  }

}

module.exports = Monkey
