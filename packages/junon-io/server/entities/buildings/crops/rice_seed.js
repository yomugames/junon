const BaseSeed = require("./base_seed")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')

class RiceSeed extends BaseSeed {
  getConstantsTable() {
    return "Crops.RiceSeed"
  }

  getType() {
    return Protocol.definition().BuildingType.RiceSeed
  }

}

module.exports = RiceSeed
