const Protocol = require("./../../../common/util/protocol")
const Constants = require("./../../../common/constants.json")

const Slave = require("./slave")

class NuuSlave extends Slave {
  getType() {
    return Protocol.definition().MobType.NuuSlave
  }

  getConstantsTable() {
    return "Mobs.NuuSlave"
  }
}

module.exports = NuuSlave
