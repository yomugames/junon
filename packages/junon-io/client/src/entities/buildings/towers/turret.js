const BaseTower = require("./base_tower")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class Turret extends BaseTower {

  getBaseSpritePath() {
    return 'ground.png'
  }

  getBarrelSpritePath() {
    return 'turret_barrel.png'
  }

  getBarrelWidth() {
    return 80
  }

  getBarrelHeight() {
    return 80
  }

  getConstantsTable() {
    return "Buildings.Turret"
  }

  getType() {
    return Protocol.definition().BuildingType.Turret
  }

}

module.exports = Turret
