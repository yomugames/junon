const BaseSeed = require("./base_seed")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')

class RedSporeling extends BaseSeed {
  getConstantsTable() {
    return "Crops.RedSporeling"
  }

  getType() {
    return Protocol.definition().BuildingType.RedSporeling
  }

}

module.exports = RedSporeling
