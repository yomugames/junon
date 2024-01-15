const BaseSeed = require("./base_seed")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')

class PumpkinSeed extends BaseSeed {
  getConstantsTable() {
    return "Crops.PumpkinSeed"
  }

  getType() {
    return Protocol.definition().BuildingType.PumpkinSeed
  }

}

module.exports = PumpkinSeed
