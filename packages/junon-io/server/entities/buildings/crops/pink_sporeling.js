const BaseSeed = require("./base_seed")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')

class PinkSporeling extends BaseSeed {
  getConstantsTable() {
    return "Crops.PinkSporeling"
  }

  getType() {
    return Protocol.definition().BuildingType.PinkSporeling
  }

}

module.exports = PinkSporeling