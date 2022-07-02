const BaseSeed = require("./base_seed")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')

class CoffeeSeed extends BaseSeed {

  getConstantsTable() {
    return "Crops.CoffeeSeed"
  }

  getType() {
    return Protocol.definition().BuildingType.CoffeeSeed
  }

}

module.exports = CoffeeSeed
