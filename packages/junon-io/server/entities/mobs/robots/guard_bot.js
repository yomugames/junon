const BaseRobot = require("./base_robot")
const Protocol = require("./../../../../common/util/protocol")
const Constants = require("./../../../../common/constants.json")

class GuardBot extends BaseRobot {

  getType() {
    return Protocol.definition().MobType.GuardBot
  }

  getConstantsTable() {
    return "Mobs.GuardBot"
  }

}

module.exports = GuardBot
