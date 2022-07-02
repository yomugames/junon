const Miner = require("./miner")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class MineralMiner extends Miner {
  getBarrelSpritePath() {
    return 'ore_miner.png'
  }

  getBaseSpritePath() {
    return 'ground.png'
  }

  getConstantsTable() {
    return "Buildings.MineralMiner"
  }

  getType() {
    return Protocol.definition().BuildingType.MineralMiner
  }

}

module.exports = MineralMiner
