const BaseTerrain = require("./../base_terrain")

class BaseGround extends BaseTerrain {
  getGroup() {
    return "grounds"
  }

  isGroundTile() {
    return true
  }

}

module.exports = BaseGround
