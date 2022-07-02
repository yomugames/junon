const BaseSeed = require("./base_seed")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')

class CottonSeed extends BaseSeed {
  getConstantsTable() {
    return "Crops.CottonSeed"
  }

  getType() {
    return Protocol.definition().BuildingType.CottonSeed
  }

  getItemDropType() {
    return Protocol.definition().BuildingType.Cotton
  }

}

module.exports = CottonSeed
