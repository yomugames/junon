const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")

const Slave = require("./slave")

class NuuSlave extends Slave {
  getConstantsTable() {
    return "Mobs.NuuSlave"
  }

  getSpritePath() {
    return "nuu_slave.png"
  }

  getType() {
    return Protocol.definition().MobType.NuuSlave
  }

  getEquipperBodySpritePath() {
    return "nuu_slave.png"
  }

}

module.exports = NuuSlave
