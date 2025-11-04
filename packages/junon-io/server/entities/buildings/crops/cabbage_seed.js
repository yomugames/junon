const BaseSeed = require("./base_seed")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')

class CabbageSeed extends BaseSeed {
  getConstantsTable() {
    return "Crops.CabbageSeed"
  }

  getType() {
    return Protocol.definition().BuildingType.CabbageSeed
  }

}

module.exports = CabbageSeed