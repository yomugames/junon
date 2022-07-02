const BaseTower = require("./base_tower")
const Constants = require("./../../../../../common/constants.json")
const Protocol = require("./../../../../../common/util/protocol")

class VoidRay extends BaseTower {

  getBaseSpritePath() {
    return 'ground.png'
  }

  getBarrelSpritePath() {
    return 'void_ray_barrel_2.png'
  }

  getConstantsTable() {
    return "Buildings.VoidRay"
  }

  getType() {
    return Protocol.definition().BuildingType.VoidRay
  }

}

module.exports = VoidRay
