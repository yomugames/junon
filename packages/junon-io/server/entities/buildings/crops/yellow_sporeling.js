const BaseSeed = require("./base_seed")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')

class YellowSporeling extends BaseSeed {
  getConstantsTable() {
    return "Crops.YellowSporeling"
  }

  getType() {
    return Protocol.definition().BuildingType.YellowSporeling
  }

}

module.exports = YellowSporeling