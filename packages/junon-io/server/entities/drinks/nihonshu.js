const BaseDrink = require("./base_drink")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class Nihonshu extends BaseDrink {
  getType() {
    return Protocol.definition().BuildingType.Nihonshu
  }

  getConstantsTable() {
    return "Drinks.Nihonshu"
  }

  feedToPlayer(player) {
    super.feedToPlayer(player)
    player.addDrunk()
    player.addRage()
  }
}

module.exports = Nihonshu