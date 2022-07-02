const Grenade = require("./grenade")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")
const Projectiles = require("./../../projectiles/index")


class PoisonGrenade extends Grenade {
  static getProjectileKlass() {
    return Projectiles.PoisonGrenade
  }

  getType() {
    return Protocol.definition().BuildingType.PoisonGrenade
  }

  getConstantsTable() {
    return "Equipments.PoisonGrenade"
  }
}

module.exports = PoisonGrenade
