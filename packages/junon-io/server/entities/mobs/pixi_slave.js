const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")

const Slave = require("./slave")

class PixiSlave extends Slave {
  getType() {
    return Protocol.definition().MobType.PixiSlave
  }

  getConstantsTable() {
    return "Mobs.PixiSlave"
  }
}

module.exports = PixiSlave
