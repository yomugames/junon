const RawFood = require("./raw_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("./../../../common/constants.json")


class RedMushroom extends RawFood {
  getType() {
    return Protocol.definition().BuildingType.RedMushroom
  }

  getConstantsTable() {
    return "Foods.RedMushroom"
  }

  onConsumed(user) {
    if (user.isPlayer()) {
        if (Math.random() * 2 > 1) {
            user.addPoison()
        }
    }
  }
}

module.exports = RedMushroom