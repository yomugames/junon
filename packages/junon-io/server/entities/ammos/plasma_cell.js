const BaseAmmo = require("./base_ammo")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class PlasmaCell extends BaseAmmo {
  getConstantsTable() {
    return "Ammos.PlasmaCell"
  }

  getType() {
    return Protocol.definition().BuildingType.PlasmaCell
  }
}

module.exports = PlasmaCell
