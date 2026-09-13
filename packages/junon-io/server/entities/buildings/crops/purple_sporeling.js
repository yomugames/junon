const BaseSeed = require("./base_seed")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')

class PurpleSporeling extends BaseSeed {
  getConstantsTable() {
    return "Crops.PurpleSporeling"
  }

  getType() {
    return Protocol.definition().BuildingType.PurpleSporeling
  }

}

module.exports = PurpleSporeling