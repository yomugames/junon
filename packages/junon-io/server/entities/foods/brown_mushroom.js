const RawFood = require("./raw_food")

const Protocol = require('../../../common/util/protocol')
const Constants = require("../../../common/constants.json")


class BrownMushroom extends RawFood {
  getType() {
    return Protocol.definition().BuildingType.BrownMushroom
  }

  getConstantsTable() {
    return "Foods.BrownMushroom"
  }

  onConsumed(user) {
    if (user.isPlayer()) {
        if (Math.random() * 2 > 1) {
            user.addDrunk()
        }
    }
  }
}

module.exports = BrownMushroom