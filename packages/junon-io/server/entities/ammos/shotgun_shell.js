const BaseAmmo = require("./base_ammo")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class ShotgunShell extends BaseAmmo {
  getConstantsTable() {
    return "Ammos.ShotgunShell"
  }

  getType() {
    return Protocol.definition().BuildingType.ShotgunShell
  }
}

module.exports = ShotgunShell
