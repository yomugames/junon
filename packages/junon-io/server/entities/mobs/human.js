const LandMob = require("./land_mob")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")
const Projectiles = require('./../projectiles/index')

class Human extends LandMob {

  getType() {
    return Protocol.definition().MobType.Human
  }

  getConstantsTable() {
    return "Mobs.Human"
  }

  onCommandSpawned() {
    this.setDormant(true)
  }

}

module.exports = Human
