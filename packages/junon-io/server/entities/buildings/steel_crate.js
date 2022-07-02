const Constants = require('../../../common/constants.json')
const Protocol = require('../../../common/util/protocol')
const BaseBuilding = require("./base_building")

class SteelCrate extends BaseBuilding {

  getConstantsTable() {
    return "Buildings.SteelCrate"
  }

  getType() {
    return Protocol.definition().BuildingType.SteelCrate
  }


}

module.exports = SteelCrate

