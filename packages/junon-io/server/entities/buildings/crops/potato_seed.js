const BaseSeed = require("./base_seed")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')

class PotatoSeed extends BaseSeed {
  getConstantsTable() {
    return "Crops.PotatoSeed"
  }

  getType() {
    return Protocol.definition().BuildingType.PotatoSeed
  }

}

module.exports = PotatoSeed
