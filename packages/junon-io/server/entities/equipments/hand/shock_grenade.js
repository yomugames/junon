const Grenade = require("./grenade")

const Protocol = require('../../../../common/util/protocol')
const Constants = require("./../../../../common/constants.json")
const Projectiles = require("./../../projectiles/index")


class ShockGrenade extends Grenade {
  static getProjectileKlass() {
    return Projectiles.ShockGrenade
  }

  getType() {
    return Protocol.definition().BuildingType.ShockGrenade
  }

  getConstantsTable() {
    return "Equipments.ShockGrenade"
  }
}

module.exports = ShockGrenade
