const BaseSeed = require("./base_seed")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')

class BrownSporeling extends BaseSeed {
  getConstantsTable() {
    return "Crops.BrownSporeling"
  }

  getType() {
    return Protocol.definition().BuildingType.BrownSporeling
  }

}

module.exports = BrownSporeling
