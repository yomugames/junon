const BaseAmmo = require("./base_ammo")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class RifleAmmo extends BaseAmmo {

  getSpritePath() {
    return 'rifle_ammo.png'
  }

  getType() {
    return Protocol.definition().BuildingType.RifleAmmo
  }

  getConstantsTable() {
    return "Ammos.RifleAmmo"
  }

}

module.exports = RifleAmmo
