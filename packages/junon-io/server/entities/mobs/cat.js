const LandMob = require("./land_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')

class Cat extends LandMob {

  getType() {
    return Protocol.definition().MobType.Cat
  }

  getConstantsTable() {
    return "Mobs.Cat"
  }

}

module.exports = Cat
