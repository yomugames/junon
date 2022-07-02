const BaseAmmo = require("./base_ammo")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class ShotgunShell extends BaseAmmo {

  getSpritePath() {
    return 'shotgun_shell.png'
  }

  getType() {
    return Protocol.definition().BuildingType.ShotgunShell
  }

  getConstantsTable() {
    return "Ammos.ShotgunShell"
  }

}

module.exports = ShotgunShell
