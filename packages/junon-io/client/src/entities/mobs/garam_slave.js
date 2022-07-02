const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

const Slave = require("./slave")

class GaramSlave extends Slave {
  getConstantsTable() {
    return "Mobs.GaramSlave"
  }

  getSpritePath() {
    return "garam_slave.png"
  }

  getType() {
    return Protocol.definition().MobType.GaramSlave
  }

  getEquipperBodySpritePath() {
    return "garam_slave_body.png"
  }

  getBodyWidth() {
    return 55
  }

  getBodyHeight() {
    return 40
  }

  getDefaultSpriteColor() {
    return 0x888888
  }

  getBodyPositionX() {
    return -12
  }

}

module.exports = GaramSlave
