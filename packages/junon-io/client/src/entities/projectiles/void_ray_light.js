const Constants = require("./../../../../common/constants.json")
const Protocol = require("./../../../../common/util/protocol")
const BaseBeam = require("./base_beam")

class VoidRayLight extends BaseBeam {

  getBaseSpritePath() {
    return 'void_ray_light.png'
  }

  getHeadSpritePath() {
    return 'light_blue_circle.png'
  }


  getType() {
    return Protocol.definition().ProjectileType.VoidRayLight
  }

  getConstantsTable() {
    return "Projectiles.VoidRayLight"
  }

}

module.exports = VoidRayLight
