const BaseRobot = require("./base_robot")
const Protocol = require("./../../../../common/util/protocol")
const Constants = require("./../../../../common/constants.json")

class FirstBot extends BaseRobot {

  getType() {
    return Protocol.definition().MobType.FirstBot
  }

  getConstantsTable() {
    return "Mobs.FirstBot"
  }

}

module.exports = FirstBot
