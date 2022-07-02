const BaseAmmo = require("./base_ammo")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class RifleAmmo extends BaseAmmo {
  getConstantsTable() {
    return "Ammos.RifleAmmo"
  }

  getType() {
    return Protocol.definition().BuildingType.RifleAmmo
  }
}

module.exports = RifleAmmo
