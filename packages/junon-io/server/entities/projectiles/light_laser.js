const BasicLaser = require("./basic_laser")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class LightLaser extends BasicLaser {

  getType() {
    return Protocol.definition().ProjectileType.LightLaser
  }

  getConstantsTable() {
    return "Projectiles.LightLaser"
  }

}

module.exports = LightLaser
