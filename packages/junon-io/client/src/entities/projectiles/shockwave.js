const Explosion = require("./explosion")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const ClientHelper = require("./../../util/client_helper")
const Helper = require("./../../../../common/helper")

class Shockwave extends Explosion {
  getType() {
    return Protocol.definition().ProjectileType.Shockwave
  }

  getConstantsTable() {
    return "Projectiles.Shockwave"
  }

}

module.exports = Shockwave
