const Pirate = require('./pirate')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Guard extends Pirate {

  getConstantsTable() {
    return "Mobs.Guard"
  }

  getSpritePath() {
    return "guard.png"
  }

  getType() {
    return Protocol.definition().MobType.Guard
  }
}

module.exports = Guard
