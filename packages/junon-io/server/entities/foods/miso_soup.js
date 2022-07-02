const BaseFood = require("./base_food")

const Protocol = require('../../../common/util/protocol')


class MisoSoup extends BaseFood {
  getType() {
    return Protocol.definition().BuildingType.MisoSoup
  }

  getConstantsTable() {
    return "Foods.MisoSoup"
  }

  onConsumed(user) {
    if (user.isPlayer()) {
      user.sector.giveToStorage(user.inventory, Protocol.definition().BuildingType.Bowl, 1)
    }
  }
}

module.exports = MisoSoup
