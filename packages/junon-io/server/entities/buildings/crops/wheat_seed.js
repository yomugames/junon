const BaseSeed = require("./base_seed")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')

class WheatSeed extends BaseSeed {

  onConstructionFinished() {
    super.onConstructionFinished()

    if (this.getPlacer() && this.getPlacer().isPlayer()) {
      this.getPlacer().walkthroughManager.handle("plant_seed")
    }
  }

  getConstantsTable() {
    return "Crops.WheatSeed"
  }

  getType() {
    return Protocol.definition().BuildingType.WheatSeed
  }

}

module.exports = WheatSeed
