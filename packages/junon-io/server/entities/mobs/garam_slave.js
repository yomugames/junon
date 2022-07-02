const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")

const Slave = require("./slave")

class GaramSlave extends Slave {
  getType() {
    return Protocol.definition().MobType.GaramSlave
  }

  getConstantsTable() {
    return "Mobs.GaramSlave"
  }
}

module.exports = GaramSlave
