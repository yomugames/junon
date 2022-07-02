const Pirate = require("./pirate")
const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")

class Guard extends Pirate {
  getConstantsTable() {
    return "Mobs.Guard"
  }

  getType() {
    return Protocol.definition().MobType.Guard
  }

}

module.exports = Guard