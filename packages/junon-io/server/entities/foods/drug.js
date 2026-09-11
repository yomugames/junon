const BaseFood = require("./base_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("../../../common/constants.json")


class Drug extends BaseFood {
  onOwnerPositionChanged() {
  }

  onOwnerAngleChanged() {
  }

  getType() {
    return Protocol.definition().BuildingType.Drug
  }

  getConstantsTable() {
    return "Foods.Drug"
  }

  use(user, entity, options = {}) {
    user.activateDrug(options.item || this)
    user.sector.giveToStorage(user.inventory, Protocol.definition().BuildingType.DrugBottle, 1)
    return true
  }

}

module.exports = Drug
