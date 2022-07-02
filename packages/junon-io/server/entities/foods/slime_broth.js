const BaseFood = require("./base_food")

const Protocol = require('../../../common/util/protocol')


class SlimeBroth extends BaseFood {
  getType() {
    return Protocol.definition().BuildingType.SlimeBroth
  }

  getConstantsTable() {
    return "Foods.SlimeBroth"
  }

  onConsumed(user) {
    if (user.isPlayer()) {
      user.sector.giveToStorage(user.inventory, Protocol.definition().BuildingType.Bowl, 1)
    }
  }
}

module.exports = SlimeBroth
