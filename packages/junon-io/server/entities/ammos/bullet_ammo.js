const BaseAmmo = require("./base_ammo")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class BulletAmmo extends BaseAmmo {
  getConstantsTable() {
    return "Ammos.BulletAmmo"
  }

  getType() {
    return Protocol.definition().BuildingType.BulletAmmo
  }
}

module.exports = BulletAmmo
