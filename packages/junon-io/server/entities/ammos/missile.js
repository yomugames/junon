const BaseAmmo = require("./base_ammo")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class Missile extends BaseAmmo {
  getConstantsTable() {
    return "Ammos.Missile"
  }

  getType() {
    return Protocol.definition().BuildingType.Missile
  }
}

module.exports = Missile
