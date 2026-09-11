const BaseSeed = require("./base_seed")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')

class WhiteSporeling extends BaseSeed {
  getConstantsTable() {
    return "Crops.WhiteSporeling"
  }

  getType() {
    return Protocol.definition().BuildingType.WhiteSporeling
  }

}

module.exports = WhiteSporeling
