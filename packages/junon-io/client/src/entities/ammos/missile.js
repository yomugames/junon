const BaseAmmo = require("./base_ammo")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Missile extends BaseAmmo {

  getSpritePath() {
    return 'missile_ammo.png'
  }

  getType() {
    return Protocol.definition().BuildingType.Missile
  }

  getConstantsTable() {
    return "Ammos.Missile"
  }

}

module.exports = Missile
