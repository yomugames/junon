const Miner = require("./miner")
const Constants = require('../../../../common/constants.json')
const Protocol = require('../../../../common/util/protocol')

class MineralMiner extends Miner {
  getConstantsTable() {
    return "Buildings.MineralMiner"
  }

  getType() {
    return Protocol.definition().BuildingType.MineralMiner
  }

  getMiningInterval() {
    return 10000
  }

  mine() {
    if (this.owner) {
      this.owner.startMining()
      // return this.container.storeMinerals(this.getProduction())
    }
  }


}

module.exports = MineralMiner

