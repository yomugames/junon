const BaseFood = require("./base_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class FirstAidKit extends BaseFood {
  getType() {
    return Protocol.definition().BuildingType.FirstAidKit
  }

  getConstantsTable() {
    return "Foods.FirstAidKit"
  }

  use(user, entity) {
    user.setHealth(user.health + this.getStats().health)
    user.setActiveDrug("FirstAidKit")
    return true
  }

}

module.exports = FirstAidKit
