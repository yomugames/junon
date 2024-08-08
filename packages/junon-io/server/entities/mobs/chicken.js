const LandMob = require("./land_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')

class Chicken extends LandMob {

  getType() {
    return Protocol.definition().MobType.Chicken
  }

  getConstantsTable() {
    return "Mobs.Chicken"
  }

}

module.exports = Chicken
