const BaseAmmo = require("./base_ammo")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class BulletAmmo extends BaseAmmo {

  getSpritePath() {
    return 'bullet_ammo.png'
  }

  getType() {
    return Protocol.definition().BuildingType.BulletAmmo
  }

  getConstantsTable() {
    return "Ammos.BulletAmmo"
  }

}

module.exports = BulletAmmo
