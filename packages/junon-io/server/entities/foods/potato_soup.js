const BaseFood = require("./base_food")

const Protocol = require('../../../common/util/protocol')


class PotatoSoup extends BaseFood {
  getType() {
    return Protocol.definition().BuildingType.PotatoSoup
  }

  getConstantsTable() {
    return "Foods.PotatoSoup"
  }

  onConsumed(user) {
    if (user.isPlayer()) {
      user.sector.giveToStorage(user.inventory, Protocol.definition().BuildingType.Bowl, 1)
    }
  }
}

module.exports = PotatoSoup
