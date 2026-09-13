const BaseSeed = require("./base_seed")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')

class GreenSporeling extends BaseSeed {
  getConstantsTable() {
    return "Crops.GreenSporeling"
  }

  getType() {
    return Protocol.definition().BuildingType.GreenSporeling
  }

}

module.exports = GreenSporeling