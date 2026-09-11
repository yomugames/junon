const BaseSeed = require("./base_seed")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')

class OrangeSporeling extends BaseSeed {
  getConstantsTable() {
    return "Crops.OrangeSporeling"
  }

  getType() {
    return Protocol.definition().BuildingType.OrangeSporeling
  }

}

module.exports = OrangeSporeling