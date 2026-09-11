const BaseFood = require("./base_food")

const Protocol = require('../../../common/util/protocol')


class MushroomSoup extends BaseFood {
  getType() {
    return Protocol.definition().BuildingType.MushroomSoup
  }

  getConstantsTable() {
    return "Foods.MushroomSoup"
  }

  onConsumed(user) {
    if (user.isPlayer()) {
      user.sector.giveToStorage(user.inventory, Protocol.definition().BuildingType.Bowl, 1)
    }
  }
}

module.exports = MushroomSoup
