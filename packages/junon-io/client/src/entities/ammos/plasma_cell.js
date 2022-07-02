const BaseAmmo = require("./base_ammo")
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class PlasmaCell extends BaseAmmo {

  getSpritePath() {
    return 'plasma_cell.png'
  }

  getType() {
    return Protocol.definition().BuildingType.PlasmaCell
  }

  getConstantsTable() {
    return "Ammos.PlasmaCell"
  }

}

module.exports = PlasmaCell
