const BaseMob = require('./base_mob')
const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

class Catapult extends BaseMob {

  getSpritePath() {
    return "/assets/images/destroyer.png"
  }

  getConstantsTable() {
    return "Mobs.Catapult"
  }

  getType() {
    return Protocol.definition().MobType.Catapult
  }



}

module.exports = Catapult
