const BaseDrink = require("./base_drink")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class EnergyDrink extends BaseDrink {
  getType() {
    return Protocol.definition().BuildingType.EnergyDrink
  }

  getConstantsTable() {
    return "Drinks.EnergyDrink"
  }

  feedToPlayer(player) {
    super.feedToPlayer(player)
    player.addHaste()
  }
}

module.exports = EnergyDrink