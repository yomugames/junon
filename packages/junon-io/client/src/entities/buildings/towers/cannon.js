const BaseTower = require("./base_tower")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Cannon extends BaseTower {

  getBaseSpritePath() {
    return 'ground.png'
  }

  getBarrelSpritePath() {
    return 'cannon_barrel.png'
  }

  getBarrelWidth() {
    return 96
  }

  getBarrelHeight() {
    return 96
  }

  getConstantsTable() {
    return "Buildings.Cannon"
  }

  getType() {
    return Protocol.definition().BuildingType.Cannon
  }

}

module.exports = Cannon
