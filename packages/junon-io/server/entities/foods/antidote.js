const BaseFood = require("./base_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class Antidote extends BaseFood {
  getType() {
    return Protocol.definition().BuildingType.Antidote
  }

  getConstantsTable() {
    return "Foods.Antidote"
  }

  use(user, entity) {
    user.removePoision()
    user.setActiveDrug("Antidote")
    return true
  }

}

module.exports = Antidote
