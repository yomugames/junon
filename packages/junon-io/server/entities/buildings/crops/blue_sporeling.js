const BaseSeed = require("./base_seed")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')

class BlueSporeling extends BaseSeed {
  getConstantsTable() {
    return "Crops.BlueSporeling"
  }

  getType() {
    return Protocol.definition().BuildingType.BlueSporeling
  }

}

module.exports = BlueSporeling