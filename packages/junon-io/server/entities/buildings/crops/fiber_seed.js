const BaseSeed = require("./base_seed")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')

class FiberSeed extends BaseSeed {
  // constructor() {

  // }

  getConstantsTable() {
    return "Crops.FiberSeed"
  }

  getType() {
    return Protocol.definition().BuildingType.FiberSeed
  }

}

module.exports = FiberSeed
