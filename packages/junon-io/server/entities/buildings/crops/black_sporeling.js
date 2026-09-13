const BaseSeed = require("./base_seed")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')

class BlackSporeling extends BaseSeed {
  getConstantsTable() {
    return "Crops.BlackSporeling"
  }

  getType() {
    return Protocol.definition().BuildingType.BlackSporeling
  }

}

module.exports = BlackSporeling