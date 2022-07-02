const BaseSeed = require("./base_seed")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')

class NitroSeed extends BaseSeed {
  // constructor() {

  // }

  getConstantsTable() {
    return "Crops.NitroSeed"
  }

  getType() {
    return Protocol.definition().BuildingType.NitroSeed
  }

  getItemDropType() {
    return Protocol.definition().BuildingType.NitroPowder
  }

}

module.exports = NitroSeed
