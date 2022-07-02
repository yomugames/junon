const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

const Slave = require("./slave")

class PixiSlave extends Slave {
  getConstantsTable() {
    return "Mobs.PixiSlave"
  }

  getSpritePath() {
    return "pixi_slave.png"
  }

  getType() {
    return Protocol.definition().MobType.PixiSlave
  }

  getEquipperBodySpritePath() {
    return "pixi_slave_body.png"
  }

  getBodyWidth() {
    return 47
  }

  getBodyHeight() {
    return 53
  }

  getDefaultSpriteColor() {
    return 0xbbbbbb
  }

  getBodyPositionX() {
    return -5
  }

  getBodyPositionY() {
    return -6
  }

}

module.exports = PixiSlave
