const BaseFood = require("./base_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class BloodPack extends BaseFood {
  getType() {
    return Protocol.definition().BuildingType.BloodPack
  }

  getConstantsTable() {
    return "Foods.BloodPack"
  }

  use(user, entity) {
    user.setHealth(user.health + this.getStats().health)
    user.setActiveDrug("BloodPack")
    return true
  }

}

module.exports = BloodPack
