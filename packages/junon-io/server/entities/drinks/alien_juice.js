const BaseDrink = require("./base_drink")
const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")

class AlienJuice extends BaseDrink {
  getType() {
    return Protocol.definition().BuildingType.AlienJuice
  }

  getConstantsTable() {
    return "Drinks.AlienJuice"
  }

  feedToPlayer(player) {
    super.feedToPlayer(player)
    player.addInvisible()
  }
}

module.exports = AlienJuice
