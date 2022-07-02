const BaseDrink = require("./base_drink")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class Beer extends BaseDrink {
  getType() {
    return Protocol.definition().BuildingType.Beer
  }

  getConstantsTable() {
    return "Drinks.Beer"
  }

  feedToPlayer(player) {
    super.feedToPlayer(player)
    player.addDrunk()
  }
}

module.exports = Beer
