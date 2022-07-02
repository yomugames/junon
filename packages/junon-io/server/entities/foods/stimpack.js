const BaseFood = require("./base_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class Stimpack extends BaseFood {
  getType() {
    return Protocol.definition().BuildingType.Stimpack
  }

  getConstantsTable() {
    return "Foods.Stimpack"
  }

  use(player, entity) {
    player.addRage()
    player.setHealth(player.getHealth() - 25)
    player.setActiveDrug("Stimpack")
    return true
  }

}

module.exports = Stimpack
